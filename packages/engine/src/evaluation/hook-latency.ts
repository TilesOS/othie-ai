import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { configSchema } from "../config.js";
import { createCredential, revokeCredential } from "../engine/credentials.js";
import { runEngine } from "../engine/lifecycle.js";

type Host = "codex" | "claude-code";
const hosts: Host[] = ["codex", "claude-code"];
const conditions = ["positive", "irrelevant", "stalled-engine", "delayed-input-stalled-engine", "stalled-input", "revoked", "unavailable"] as const;
type Condition = typeof conditions[number];
const source = "Canary support policy requires the first response within eleven hours on weekends. This is a first-response target, not a resolution deadline.\n";
const positivePrompt = "What is the Canary support policy weekend first-response target?";
const irrelevantPrompt = "Refactor a JavaScript sorting comparator. Do not use tools.";
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

export const hookLatencyOptionsSchema = z.object({
  repeats: z.number().int().min(1).max(20).default(3),
  deadline_ms: z.number().int().min(1).max(20_000).default(2_000),
  host_timeout_ms: z.number().int().min(1).max(30_000).default(3_000),
}).strict().refine((value) => value.host_timeout_ms > value.deadline_ms, "host timeout must exceed the adapter deadline");
type Options = z.infer<typeof hookLatencyOptionsSchema>;

interface ProcessResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  wall_ms: number;
  timed_out: boolean;
  output_limit_exceeded: boolean;
  start_failed: boolean;
}

function invoke(adapter: string, cli: string, config: string, credential: string, workspace: string,
  host: Host, condition: Condition, options: Options): Promise<ProcessResult> {
  return new Promise((done) => {
    const started = performance.now();
    const child = spawn(process.execPath, [adapter, "--cli", cli, "--config", config, "--bridge", host,
      "--credential-file", credential, "--max-tokens", "500", "--deadline-ms", String(options.deadline_ms), "--diagnostics-json"],
    { cwd: workspace, stdio: "pipe", shell: false });
    let stdout = "", stderr = "", bytes = 0, timedOut = false, oversized = false, startFailed = false;
    let inputTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, options.host_timeout_ms);
    const collect = (stream: "stdout" | "stderr", chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 2_000_000) { oversized = true; child.kill("SIGKILL"); return; }
      if (stream === "stdout") stdout += chunk; else stderr += chunk;
    };
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => collect("stdout", chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => collect("stderr", chunk));
    child.stdin.on("error", () => {});
    child.once("error", () => { startFailed = true; });
    child.once("close", (code, signal) => {
      clearTimeout(timer); clearTimeout(inputTimer);
      done({ code, signal, stdout, stderr, wall_ms: performance.now() - started,
        timed_out: timedOut, output_limit_exceeded: oversized, start_failed: startFailed });
    });
    const event = JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd: workspace,
      prompt: condition === "irrelevant" ? irrelevantPrompt : positivePrompt,
      transcript_path: "PRIVATE_TRANSCRIPT", session_id: "PRIVATE_SESSION" });
    if (condition === "stalled-input") return;
    if (condition === "delayed-input-stalled-engine") {
      child.stdin.write(event.slice(0, 1));
      inputTimer = setTimeout(() => child.stdin.end(event.slice(1)), Math.floor(options.deadline_ms * 0.6));
    } else child.stdin.end(event);
  });
}

// Keep failed or malformed diagnostic output in the raw attempt; never promote it
// to a successful result just because the process exited before its outer timeout.
const diagnosticSchema = z.object({
  schema_version: z.literal("1"), event: z.literal("othie_prompt_hook"), host: z.enum(["codex", "claude-code"]),
  surface: z.literal("code"), phase: z.literal("turn_start"),
  outcome: z.enum(["injected", "empty", "context_timeout", "context_unavailable", "invalid_event", "invalid_options", "invalid_context_response"]),
  elapsed_ms: z.number().int().nonnegative(),
  mode: z.enum(["deterministic", "synthesized", "fallback", "empty"]).optional(),
  token_count: z.number().int().nonnegative().max(500).optional(),
  omitted_items: z.number().int().nonnegative().optional(), rule_count: z.number().int().nonnegative().optional(),
  excerpt_count: z.number().int().nonnegative().optional(), synthesis_count: z.number().int().nonnegative().optional(),
  conflict_count: z.number().int().nonnegative().optional(),
}).strict();

export function scoreHookLatencyAttempt(host: Host, condition: Condition, result: ProcessResult, options: Options, engineReceived: boolean) {
  let diagnostic: z.infer<typeof diagnosticSchema> | null = null;
  try { diagnostic = diagnosticSchema.parse(JSON.parse(result.stderr)); } catch { /* Preserve invalid output as failure. */ }
  const expected = condition === "positive" ? "injected" : condition === "irrelevant" ? "empty"
    : condition === "revoked" || condition === "unavailable" ? "context_unavailable" : "context_timeout";
  let citedDelivery = false;
  try {
    const output = JSON.parse(result.stdout) as { hookSpecificOutput?: { hookEventName?: string; additionalContext?: string } };
    const context = output.hookSpecificOutput?.additionalContext;
    citedDelivery = output.hookSpecificOutput?.hookEventName === "UserPromptSubmit" && typeof context === "string"
      && context.includes("eleven hours") && context.includes("not a resolution deadline") && context.includes('source="s1/canary.md"');
  } catch { /* Empty or malformed output cannot establish positive delivery. */ }
  const injected = expected === "injected";
  const stalledEngine = condition === "stalled-engine" || condition === "delayed-input-stalled-engine";
  const behaviorPassed = result.code === 0 && !result.start_failed && !result.output_limit_exceeded && !result.timed_out
    && diagnostic?.host === host && diagnostic.outcome === expected
    && (injected ? citedDelivery && diagnostic.token_count !== undefined : result.stdout === "")
    && (!stalledEngine || engineReceived) && (condition !== "stalled-input" || !engineReceived)
    && (condition !== "positive" && condition !== "irrelevant" || engineReceived)
    && (expected !== "context_unavailable" || !engineReceived)
    && !result.stdout.includes("PRIVATE_") && !result.stderr.includes("PRIVATE_");
  // Normal delivery must meet the complete process budget, including module and CLI
  // startup. Timeout controls instead require termination within the host's outer budget.
  const processDeadline = expected === "context_timeout" ? options.host_timeout_ms : options.deadline_ms;
  const latencyPassed = !result.timed_out && result.wall_ms < processDeadline;
  return { expected_outcome: expected, diagnostic, engine_received: engineReceived,
    process_budget_ms: processDeadline, behavior_passed: behaviorPassed, latency_passed: latencyPassed, passed: behaviorPassed && latencyPassed };
}

export async function runHookLatencyAcceptance(out: string, input: Partial<Options> = {}) {
  const options = hookLatencyOptionsSchema.parse(input);
  // Reserve the destination before starting any engine or generating credentials.
  await mkdir(out, { mode: 0o700 });
  const repository = fileURLToPath(new URL(import.meta.url.includes("/dist/") ? "../../../../../" : "../../../../", import.meta.url));
  const cli = join(repository, "packages/engine/dist/src/cli.js");
  const adapters = Object.fromEntries(hosts.map((host) => [host, join(repository, "integrations", host, "dist/src/user-prompt-submit.js")])) as Record<Host, string>;
  const adapterHashes = Object.fromEntries(await Promise.all(hosts.map(async (host) => [host, sha256(await readFile(adapters[host]))])));
  const protocol = { protocol_version: "hook-latency-v1", recorded_at: new Date().toISOString(), synthetic_only: true,
    platform: process.platform, arch: process.arch, node: process.version, options, hosts, conditions,
    fixture: { source, positive_prompt: positivePrompt, irrelevant_prompt: irrelevantPrompt },
    fixture_sha256: sha256(JSON.stringify({ source, positivePrompt, irrelevantPrompt })),
    adapter_sha256: adapterHashes, cli_sha256: sha256(await readFile(cli)),
    hook_runtime_sha256: sha256(await readFile(join(repository, "packages/hooks/dist/src/index.js"))),
    engine_state: "Fresh engine, index, sources and credentials per repeat; fixed condition order; host order alternates per repeat.",
    timing: "Parent monotonic clock from before spawn through process close, including module startup, stdin, CLI startup, IPC, validation and output. Adapter elapsed_ms starts at Node's performance time origin, including module initialization.",
    limitations: "Compiled adapters invoked directly, not native host sessions. Synthetic lexical excerpt fallback; extraction, embeddings and synthesis disabled. No semantic filtering or model latency claim. Timeout controls use the host outer budget; no assumption of exact timer scheduling. Repeats are local observations, not independent samples or macOS/Windows acceptance." };
  await writeFile(join(out, "protocol.json"), JSON.stringify(protocol, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  const attempts = [];
  for (let repeat = 1; repeat <= options.repeats; repeat++) {
    const root = await realpath(await mkdtemp(join(tmpdir(), "othie-hook-latency-")));
    let running: Awaited<ReturnType<typeof runEngine>> | undefined;
    try {
      const workspace = join(root, "workspace with spaces"), docs = join(root, "sources"), state = join(root, "state");
      await mkdir(workspace); await mkdir(docs); await mkdir(state);
      await writeFile(join(docs, "canary.md"), source);
      const config = configSchema.parse({ version: 1, data_dir: state, credentials_file: join(state, "credentials.json"),
        ingestion: { watch_enabled: false }, profiles: { company: {
          sources: [{ root: docs, role: "reference", authority_priority: 50, retrieval_weight: 1, global_rule_documents: [] }],
          permitted_exports: "rules_and_excerpts", providers: { extraction: [], embeddings: [], synthesis: [] },
          token_budget: { enabled: true, max_tokens: 500, tokenizer: "o200k_base" },
        } } });
      const configPath = join(root, "config.json"), credentials = {} as Record<Host, string>;
      await writeFile(configPath, JSON.stringify(config));
      for (const host of hosts) {
        credentials[host] = join(state, `${host}.credential`);
        await writeFile(credentials[host], await createCredential(config.credentials_file!, host, ["company"], "company"), { mode: 0o600 });
      }
      running = await runEngine(config);
      const indexDeadline = performance.now() + 10_000;
      while (!running.engine.store.listActiveChunks("company").length) {
        if (performance.now() >= indexDeadline) throw new Error("Synthetic indexing timed out");
        await new Promise((done) => setTimeout(done, 25));
      }
      const engine = running.engine, originalContext = engine.context;
      const hostOrder = repeat % 2 === 1 ? hosts : [...hosts].reverse();
      for (const condition of conditions) {
        if (condition === "revoked") for (const host of hosts) await revokeCredential(config.credentials_file!, host);
        if (condition === "unavailable") { await running!.close(); running = undefined; }
        for (const host of hostOrder) {
          let engineReceived = false;
          let release!: () => void;
          const gate = new Promise<void>((done) => { release = done; });
          engine.context = async (...args) => {
            engineReceived = true;
            if (condition === "stalled-engine" || condition === "delayed-input-stalled-engine") {
              await gate;
              throw new Error("Synthetic stalled request released");
            }
            return originalContext.apply(engine, args);
          };
          let result: ProcessResult;
          try { result = await invoke(adapters[host], cli, configPath, credentials[host], workspace, host, condition, options); }
          finally { engine.context = originalContext; release(); }
          const scored = scoreHookLatencyAttempt(host, condition, result, options, engineReceived);
          const attempt = { repeat, host, condition, ...result, ...scored };
          await writeFile(join(out, `${repeat}-${host}-${condition}.json`), JSON.stringify(attempt, null, 2) + "\n", { flag: "wx", mode: 0o600 });
          const { stdout, stderr, ...compact } = attempt;
          attempts.push(compact);
          process.stderr.write(`Hook latency ${repeat}/${host}/${condition}: passed=${attempt.passed}, wall_ms=${Math.round(result.wall_ms)}\n`);
        }
      }
    } finally { await running?.close(); await rm(root, { recursive: true, force: true }); }
  }
  const summary = { ...protocol, completed: true, behavior_passed: attempts.every((attempt) => attempt.behavior_passed),
    latency_passed: attempts.every((attempt) => attempt.latency_passed), passed: attempts.every((attempt) => attempt.passed), attempts };
  await writeFile(join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argument = (name: string) => { const index = process.argv.indexOf(`--${name}`); return index < 0 ? undefined : process.argv[index + 1]; };
  const out = resolve(argument("out") ?? `packages/engine/evaluation/results/hook-latency-${Date.now()}`);
  await mkdir(resolve(out, ".."), { recursive: true });
  const input = Object.fromEntries(["repeats", "deadline-ms", "host-timeout-ms"].flatMap((name) =>
    argument(name) === undefined ? [] : [[name.replaceAll("-", "_"), Number(argument(name))]]));
  void runHookLatencyAcceptance(out, input).then((report) => {
    process.stdout.write(JSON.stringify({ report: join(out, "summary.json"), passed: report.passed }) + "\n");
    if (!report.passed) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Hook latency acceptance failed; inspect preserved records.\n"); process.exitCode = 1; });
}
