import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { configSchema } from "../config.js";
import { createCredential } from "../engine/credentials.js";
import { runEngine } from "../engine/lifecycle.js";
import { countTokens } from "../tokenizer.js";
import { gradeCode, gradeModules } from "./agent-grader.js";
import { evaluationArguments } from "./arguments.js";
import { parseHookDiagnostic } from "./hook-diagnostics.js";
import type { AgentCondition } from "./local-agent.js";
import { nativeAgentCases, nativeAgentDocuments, nativeAgentInstructions, nativeAgentPolicySources } from "./native-agent-cases.js";
import { nativeAgentProjectCases, nativeAgentProjectInstructions, nativeAgentProjectPolicySources, type NativeAgentCase } from "./native-agent-projects.js";
import { codexHookConfiguration, createCodexProjectHome, recordingWrapper, redactNativeTranscript, shellQuote } from "./native-hooks.js";

const optionsSchema = z.object({
  out: z.string().min(1), model: z.string().trim().min(1).default("gpt-6-astra"),
  repeats: z.number().int().min(1).max(10).default(1),
  contextTokens: z.number().int().min(80).max(500).default(500),
  timeoutMs: z.number().int().min(10_000).max(600_000).default(180_000),
  corpus: z.enum(["pilot", "multi-file"]).default("pilot"),
  cases: z.array(z.string()).min(1).optional(),
}).strict().superRefine((value, context) => {
  const corpus = value.corpus === "pilot" ? nativeAgentCases : nativeAgentProjectCases;
  if (value.cases && (new Set(value.cases).size !== value.cases.length || value.cases.some((id) => !corpus.some((item) => item.id === id)))) {
    context.addIssue({ code: "custom", message: "Unknown or duplicate native agent cases" });
  }
}).transform((value) => ({ ...value, cases: value.cases ?? (value.corpus === "pilot" ? nativeAgentCases : nativeAgentProjectCases).map((item) => item.id) }));

export function nativeAgentOptions(argv: string[]) {
  const args = evaluationArguments(argv, ["out", "model", "repeats", "context-tokens", "timeout-ms", "cases", "corpus"], "native agent");
  return optionsSchema.parse({
    out: resolve(args.get("out") ?? `packages/engine/evaluation/results/native-agent-${Date.now()}`),
    ...(args.has("model") ? { model: args.get("model") } : {}),
    ...(args.has("repeats") ? { repeats: Number(args.get("repeats")) } : {}),
    ...(args.has("context-tokens") ? { contextTokens: Number(args.get("context-tokens")) } : {}),
    ...(args.has("timeout-ms") ? { timeoutMs: Number(args.get("timeout-ms")) } : {}),
    ...(args.has("cases") ? { cases: args.get("cases")!.split(",") } : {}),
    ...(args.has("corpus") ? { corpus: args.get("corpus") } : {}),
  });
}

export function nativeAgentFiles(scenario: NativeAgentCase): Record<string, string> {
  if (scenario.project) return {
    ...scenario.project.files,
    "AGENTS.md": nativeAgentProjectInstructions(scenario) + "\n",
    "README.md": "Repair the service described in CONTRACT.md and the task. Run node --test. Company documents are external. Public tests cover the request envelope; separate grading checks domain, service and endpoint behavior.\n",
    "solution.test.cjs": `const {test} = require('node:test');
const assert = require('node:assert/strict');
const {solve} = require('./${scenario.project.entry}');
const probes = ${JSON.stringify(scenario.publicProbes)};
for (const [index, probe] of probes.entries()) test('public interface ' + index, () => {
  const before = JSON.stringify(probe.input);
  assert.deepEqual(solve(...probe.input), probe.expected);
  assert.equal(JSON.stringify(probe.input), before);
});
`,
  };
  return {
    "solution.js": scenario.initial,
    "AGENTS.md": nativeAgentInstructions + "\n",
    "README.md": "Implement the task in solution.js as a self-contained function solve, without imports or exports. Only solution.js is editable. Do not mutate inputs. Run node --test. Company documents are external; they are not in this repository. Public tests check only a few interface examples; final scoring checks separate policy boundaries.\n",
    "solution.test.cjs": `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const probes = ${JSON.stringify(scenario.publicProbes)};
for (const [index, probe] of probes.entries()) test('public interface ' + index, () => {
  const args = JSON.stringify(probe.input);
  const result = JSON.parse(new vm.Script(readFileSync('solution.js', 'utf8') + '\\n' +
    '(() => { const args = ' + args + '; const before = JSON.stringify(args); const actual = solve(...args); return JSON.stringify({ actual, unchanged: before === JSON.stringify(args) }); })()'
  ).runInNewContext(Object.create(null), { timeout: 250, contextCodeGeneration: { strings: false, wasm: false } }));
  if (['number', 'boolean'].includes(probe.expected)) assert.equal(typeof result.actual, probe.expected);
  else assert.deepEqual(result.actual, probe.expected);
  assert.equal(result.unchanged, true);
});
`,
  };
}

export interface NativeAgentProcess { code: number | null; stdout: string; stderr: string; timed_out: boolean; output_limit: boolean }
// Kill the entire session's process group on timeout, including native shell tools.
// Keep model-controlled output bounded and make truncation an explicit failure.
export async function nativeAgentProcess(command: string, args: string[], cwd: string, timeoutMs: number, environment: NodeJS.ProcessEnv = {}): Promise<NativeAgentProcess> {
  return new Promise((done, reject) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("CODEX_") && !key.startsWith("OTHIE_") && !["OPENAI_API_KEY", "ANTHROPIC_API_KEY"].includes(key)));
    const child = spawn(command, args, { cwd, env: { ...env, ...environment }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", bytes = 0, timedOut = false, outputLimit = false;
    const kill = () => { if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } } };
    const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    const collect = (stream: "stdout" | "stderr", chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 4_000_000) { outputLimit = true; kill(); return; }
      if (stream === "stdout") stdout += chunk; else stderr += chunk;
    };
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => collect("stdout", chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => collect("stderr", chunk));
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); done({ code, stdout, stderr, timed_out: timedOut, output_limit: outputLimit }); });
  });
}

export function nativeAgentEvents(stdout: string) {
  const events = stdout.split("\n").filter(Boolean).map((line) => { try { return JSON.parse(line) as Record<string, unknown>; } catch { return null; } });
  const completed = events.filter((event) => event?.type === "turn.completed");
  const items = events.flatMap((event) => event?.type === "item.completed" && event.item && typeof event.item === "object" ? [event.item as Record<string, unknown>] : []);
  const commands = items.filter((item) => item.type === "command_execution");
  const usageSchema = z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative(), cached_input_tokens: z.number().int().nonnegative().optional() });
  const usages = completed.map((event) => usageSchema.safeParse(event!.usage));
  return {
    completed: events.length > 0 && events.every(Boolean) && completed.length === 1 && !events.some((event) => event?.type === "turn.failed" || event?.type === "error"),
    command_calls: commands.length,
    ran_public_tests: commands.some((item) => typeof item.command === "string" && /\bnode\s+--test\b/.test(item.command) && item.exit_code === 0 && typeof item.aggregated_output === "string" && item.aggregated_output.includes("public interface 0")),
    input_tokens: usages.length === 1 && usages[0]!.success ? usages[0]!.data.input_tokens : null,
    output_tokens: usages.length === 1 && usages[0]!.success ? usages[0]!.data.output_tokens : null,
    cached_input_tokens: usages.length === 1 && usages[0]!.success ? usages[0]!.data.cached_input_tokens ?? null : null,
  };
}

export function nativeAgentDelivery(receipt: unknown, expectedXml: string, expectedItems: boolean, cap: number): boolean {
  const schema = z.object({ event: z.literal("UserPromptSubmit"), model: z.string().nullable(), stdout: z.string(), stderr: z.string(), code: z.literal(0), input_fields: z.array(z.string()) }).strict();
  const parsed = schema.safeParse(receipt);
  if (!parsed.success) return false;
  const diagnostic = parseHookDiagnostic(parsed.data.stderr);
  if (!diagnostic || diagnostic.host !== "codex" || diagnostic.outcome !== (expectedItems ? "injected" : "empty") || diagnostic.token_count !== countTokens(expectedXml, "o200k_base") || diagnostic.token_count > cap) return false;
  if (!expectedItems) return parsed.data.stdout === "";
  try {
    const output = z.object({ hookSpecificOutput: z.object({ hookEventName: z.literal("UserPromptSubmit"), additionalContext: z.string() }).strict() }).strict().parse(JSON.parse(parsed.data.stdout));
    return output.hookSpecificOutput.additionalContext === `Othie context brief (source-backed; preserve the included citations):\n${expectedXml}`;
  } catch { return false; }
}

export function nativeAgentContextComplete(scenario: NativeAgentCase, text: string, hasItems: boolean): boolean {
  if (scenario.control) return !hasItems;
  const policy = nativeAgentDocuments.find((document) => document.name === (nativeAgentPolicySources[scenario.id] ?? nativeAgentProjectPolicySources[scenario.id]));
  const sentences = policy ? [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(policy.text)].map(({ segment }) => segment.trim()) : [];
  return hasItems && sentences.length > 0 && sentences.every((sentence) => text.includes(sentence));
}

export async function nativeAgentIntegrity(workspace: string, files: Record<string, string>, editable: readonly string[] = ["solution.js"]) {
  const directories = new Set(Object.keys(files).flatMap((name) => {
    const parts = name.split("/"); return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
  }));
  const changes = new Set<string>();
  async function walk(directory = "") {
    for (const item of await readdir(join(workspace, directory), { withFileTypes: true })) {
      const name = directory ? `${directory}/${item.name}` : item.name;
      if (name === ".git") continue;
      if (item.isDirectory() && directories.has(name)) await walk(name);
      else if (!item.isFile() || !Object.hasOwn(files, name)) changes.add(name);
    }
  }
  await walk();
  for (const [name, original] of Object.entries(files)) {
    const path = join(workspace, name);
    // Never follow a replaced parent directory into the host filesystem.
    if ((await Promise.all(name.split("/").slice(0, -1).map((_, index) => lstat(join(workspace, ...name.split("/").slice(0, index + 1))).catch(() => null)))).some((stat) => !stat?.isDirectory())) {
      changes.add(name); continue;
    }
    const stat = await lstat(path).catch(() => null);
    if (!stat?.isFile() || stat.size > 100_000) { changes.add(name); continue; }
    if (!editable.includes(name) && await readFile(path, "utf8") !== original) changes.add(name);
  }
  return { passed: changes.size === 0, changes: [...changes].sort() };
}

const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const save = (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });

export async function runNativeAgentBenchmark(input: z.input<typeof optionsSchema>) {
  const options = optionsSchema.parse(input);
  if (process.platform === "win32") throw new Error("Native agent process groups and hook quoting require separate Windows acceptance");
  await mkdir(options.out, { mode: 0o700 });
  const root = await realpath(await mkdtemp(join(tmpdir(), "othie-native-agent-")));
  let running: Awaited<ReturnType<typeof runEngine>> | undefined;
  let stage = "setup";
  try {
    const repository = fileURLToPath(new URL("../../../../../", import.meta.url));
    const adapter = join(repository, "integrations/codex/dist/src/user-prompt-submit.js"), cli = fileURLToPath(new URL("../cli.js", import.meta.url));
    const docs = join(root, "docs"), state = join(root, "state");
    await mkdir(docs); await mkdir(state);
    for (const document of nativeAgentDocuments) await writeFile(join(docs, document.name), document.text);
    const config = configSchema.parse({ version: 1, data_dir: state, credentials_file: join(state, "credentials.json"),
      ingestion: { watch_enabled: false, chunk_tokens: 500, overlap_tokens: 0 }, profiles: { company: {
        sources: [{ root: docs, role: "reference", authority_priority: 50, retrieval_weight: 1, global_rule_documents: [] }],
        permitted_exports: "rules_and_excerpts", providers: { embeddings: [], extraction: [], synthesis: [] },
        token_budget: { enabled: true, max_tokens: 500, tokenizer: "o200k_base" },
      } } });
    const configPath = join(root, "config.json"), credentialPath = join(root, "host.credential");
    const credential = await createCredential(config.credentials_file!, "codex", ["company"], "company");
    await writeFile(configPath, JSON.stringify(config)); await writeFile(credentialPath, credential, { mode: 0o600 });
    const redact = (text: string) => redactNativeTranscript(text, [[credential, "<credential>"], [root, "<temporary-fixture>"], [repository, "<othie-repository>"], [homedir(), "<user-home>"]]);
    const version = await nativeAgentProcess("codex", ["--version"], root, 10_000);
    if (version.code !== 0) throw new Error("Could not identify native Codex version");
    const fullDocuments = nativeAgentDocuments.map((doc) => `${doc.name}:\n${doc.text}`).join("\n\n");
    const corpus: NativeAgentCase[] = options.corpus === "pilot" ? nativeAgentCases : nativeAgentProjectCases;
    const cases = options.cases.map((id) => corpus.find((item) => item.id === id)!);
    const instructions = options.corpus === "pilot" ? nativeAgentInstructions : Object.fromEntries(cases.map((scenario) => [scenario.id, nativeAgentProjectInstructions(scenario)]));
    const policySources = options.corpus === "pilot" ? nativeAgentPolicySources : nativeAgentProjectPolicySources;
    const protocol = { protocol_version: "native-agent-v3", recorded_at: new Date().toISOString(), synthetic_only: true,
      node: process.version, platform: process.platform, arch: process.arch, host: "codex", host_version: version.stdout.trim(),
      requested_model: options.model, reasoning_effort: "low", options: { ...options, out: "<output>" },
      fixture_sha256: hash(JSON.stringify({ cases, documents: nativeAgentDocuments, instructions, instructions_location: "AGENTS.md", policy_sources: policySources })),
      documents: nativeAgentDocuments, cases, instructions, policy_sources: policySources,
      instructions_location: "AGENTS.md",
      full_document_tokens: countTokens(fullDocuments, "o200k_base"), tokenizer: "o200k_base",
      compiled_artifacts: await Promise.all([adapter, cli, fileURLToPath(import.meta.url), fileURLToPath(new URL("./agent-grader.js", import.meta.url)), fileURLToPath(new URL("./native-agent-projects.js", import.meta.url)), join(repository, "packages/hooks/dist/src/index.js")].map(async (path) => ({ path: path.slice(repository.length), sha256: hash(await readFile(path)) }))),
      context_pipeline: "Real engine indexing, lexical excerpt retrieval and compiled prompt hook; extraction, embeddings and synthesis disabled",
      isolation: "Fresh Git workspace and disposable CODEX_HOME per trajectory; only existing file-backed login copied; user config/rules and plugins disabled; workspace-write tool sandbox; generated hook trusted for one invocation",
      limitations: "Small synthetic functions or miniature multi-file services with native shell/edit tools, not production repository or interactive desktop acceptance. Separate hidden behavioral probes are not placed in the workspace; isolation from a deliberately hostile agent is not proven. Public-test execution is observed from native command events; recursive integrity checks detect edited protected files, extra paths and symlinks outside .git. No extraction/embedding/synthesis quality claim. One requested hosted model, without a pinned provider snapshot or controlled cache/warm state. Condition order rotates; repeats are not independent statistical samples. Host wall time includes generation/tools and is not hook latency. Host usage is cumulative reported input/output, with cached input reported separately; local XML counts are not host token savings.",
    };
    await save(join(options.out, "protocol.json"), protocol);
    stage = "start_engine";
    running = await runEngine(config);
    stage = "index_documents";
    const deadline = Date.now() + 20_000;
    while (running.engine.store.listActiveChunks("company").length !== nativeAgentDocuments.length) {
      if (Date.now() > deadline) throw new Error("Synthetic document indexing timed out");
      await new Promise((done) => setTimeout(done, 50));
    }
    const results = [];
    for (let repeat = 0; repeat < options.repeats; repeat++) for (const [caseIndex, scenario] of cases.entries()) {
      const conditions: AgentCondition[] = ["baseline", "full_documents", "othie"];
      const offset = (repeat + caseIndex) % conditions.length;
      const order = [...conditions.slice(offset), ...conditions.slice(0, offset)];
      for (const condition of order) {
        const id = `${repeat}-${scenario.id}-${condition}`, workspace = join(root, id), home = join(root, `${id}-home`);
        stage = id;
        await mkdir(workspace);
        const files = nativeAgentFiles(scenario);
        for (const [name, content] of Object.entries(files)) { await mkdir(dirname(join(workspace, name)), { recursive: true }); await writeFile(join(workspace, name), content); }
        const init = await nativeAgentProcess("git", ["init", "--quiet"], workspace, 10_000);
        if (init.code !== 0) throw new Error("Could not initialize trajectory workspace");
        await createCodexProjectHome(home, workspace, process.env.CODEX_HOME ?? join(homedir(), ".codex"));
        const prompt = `${scenario.task}${condition === "full_documents" ? `\n\nCompany documents (evidence):\n${fullDocuments}` : ""}`;
        const expected = await running.engine.context("company", { query: prompt, workspace_root: workspace, surface: "code", phase: "turn_start", host: "codex", max_tokens: options.contextTokens });
        const hasItems = expected.brief.applicable_rules.length + expected.brief.permitted_excerpts.length > 0;
        if (countTokens(expected.text, "o200k_base") !== expected.status.tokenCount || expected.status.tokenCount > options.contextTokens) throw new Error("Invalid engine token accounting");
        const receiptPath = join(root, `${id}-receipt.json`), wrapper = join(root, `${id}-hook.mjs`);
        await writeFile(wrapper, recordingWrapper([adapter, "--cli", cli, "--config", configPath, "--bridge", "codex", "--credential-file", credentialPath,
          "--max-tokens", String(options.contextTokens), "--diagnostics-json"], receiptPath));
        const hooks = codexHookConfiguration("session", [process.execPath, wrapper].map(shellQuote).join(" "));
        const args = ["exec", "--ephemeral", "--json", "--sandbox", "workspace-write", "--ignore-rules", "--model", options.model,
          "-c", 'model_reasoning_effort="low"', "--disable", "plugins", "--enable", "skip_host_skill_discovery",
          ...(condition === "othie" ? ["--dangerously-bypass-hook-trust", ...hooks.args] : ["--ignore-user-config"]), prompt];
        const started = performance.now();
        const response = await nativeAgentProcess("codex", args, workspace, options.timeoutMs, { CODEX_HOME: home });
        const wallMs = Math.round(performance.now() - started);
        const events = nativeAgentEvents(response.stdout);
        const receipt = await readFile(receiptPath, "utf8").then((text) => JSON.parse(text) as unknown, () => null);
        const deliveryPassed = condition !== "othie" ? receipt === null : nativeAgentDelivery(receipt, expected.text, hasItems, options.contextTokens) && hasItems === !scenario.control;
        const contextComplete = condition !== "othie" ? null : nativeAgentContextComplete(scenario, expected.text, hasItems);
        const integrity = await nativeAgentIntegrity(workspace, files, scenario.project?.editable);
        const solutionStat = await lstat(join(workspace, "solution.js")).catch(() => null);
        const code = solutionStat?.isFile() && solutionStat.size <= 100_000 ? await readFile(join(workspace, "solution.js"), "utf8") : "";
        // Do not read through paths that failed the integrity gate (including
        // symlinked parent directories). Preserve the failure with empty modules.
        const finalFiles: Record<string, string> | null = scenario.project ? {} : null;
        if (finalFiles && integrity.passed) for (const name of Object.keys(files).filter((name) => name.endsWith(".cjs") && name !== "solution.test.cjs")) finalFiles[name] = await readFile(join(workspace, name), "utf8");
        const grade = scenario.project ? await gradeModules(finalFiles!, scenario.project.entry, scenario.hiddenProbes) : await gradeCode(code, scenario.hiddenProbes);
        const publicGrade = scenario.project ? await gradeModules(finalFiles!, scenario.project.entry, scenario.publicProbes, true) : await gradeCode(code, scenario.publicProbes, true);
        const operational = response.code === 0 && !response.timed_out && !response.output_limit && events.completed && integrity.passed && events.ran_public_tests;
        const record = { case_id: scenario.id, family: scenario.family, repeat, condition, order, prompt,
          expected_noop: !!scenario.control, delivery_passed: deliveryPassed, context_complete: contextComplete, integrity, ...events,
          host_model: condition === "othie" && receipt && typeof receipt === "object" && "model" in receipt ? receipt.model : null,
          supplied_context_tokens: condition === "full_documents" ? countTokens(fullDocuments, "o200k_base") : condition === "othie" && hasItems ? expected.status.tokenCount : 0,
          expected_context: condition === "othie" ? { text: expected.text, status: expected.status } : null,
          response: { ...response, stdout: redact(response.stdout), stderr: redact(response.stderr) }, receipt,
          final_code: scenario.project ? null : code, final_files: finalFiles, public_grade: publicGrade, grade, operational, wall_ms: wallMs,
          correct: operational && deliveryPassed && contextComplete !== false && publicGrade.passed === publicGrade.total && grade.passed === grade.total };
        await writeFile(join(options.out, `${id}.json`), redact(JSON.stringify(record, null, 2)) + "\n", { flag: "wx", mode: 0o600 });
        const { prompt: _prompt, response: _response, receipt: _receipt, final_code: _code, final_files: _files, expected_context: _context, ...summary } = record;
        results.push({ ...summary, transcript: `${id}.json` });
        process.stderr.write(`Native agent ${scenario.id} / ${condition} / repeat ${repeat + 1}: ${grade.passed}/${grade.total}; operational=${operational}; delivery=${deliveryPassed}\n`);
        await rm(workspace, { recursive: true, force: true }); await rm(home, { recursive: true, force: true });
      }
    }
    const summary = { protocol: "protocol.json", completed: true, all_correct: results.every((item) => item.correct), results };
    await save(join(options.out, "summary.json"), summary);
    return summary;
  } catch (error) {
    // Content-free failure metadata preserves the stage without copying a native
    // exception's credentials, host paths or socket names into published evidence.
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[A-Z_]+$/.test(error.code) ? error.code : null;
    await save(join(options.out, "failure.json"), { completed: false, stage, code });
    throw error;
  } finally { await running?.close(); await rm(root, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = nativeAgentOptions(process.argv.slice(2));
  await mkdir(resolve(options.out, ".."), { recursive: true });
  void runNativeAgentBenchmark(options).then((report) => {
    process.stdout.write(JSON.stringify({ report: join(options.out, "summary.json"), trajectories: report.results.length, all_correct: report.all_correct }) + "\n");
    if (!report.all_correct) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Native agent benchmark failed; inspect preserved evidence.\n"); process.exitCode = 1; });
}
