import { spawn } from "node:child_process";
import { evaluationArguments } from "./arguments.js";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { configSchema } from "../config.js";
import { createCredential, revokeCredential } from "../engine/credentials.js";
import { runEngine } from "../engine/lifecycle.js";

const hosts = ["codex", "claude-code"] as const;
type Host = typeof hosts[number];
const hookDeadlineMs = 2_000, outerTimeoutMs = 3_000;
const positive = "According to Canary support policy, what is the first-response target?";
const irrelevant = "Refactor the JavaScript sorting comparator. Do not use tools.";
const policy = "Canary support policy requires the first response within eleven hours. This is a first-response target, not a resolution deadline.";
const repository = fileURLToPath(new URL(import.meta.url.includes("/dist/") ? "../../../../../" : "../../../../", import.meta.url));
const adapterPath = (host: Host) => join(repository, "integrations", host, "dist/src/user-prompt-submit.js");
const cliPath = join(repository, "packages/engine/dist/src/cli.js");

/** Parent timing includes spawn, module loading, stdin, CLI/IPC, validation,
 * output and process exit. No native host or model is launched. */
async function invoke(host: Host, config: string, credential: string, cwd: string, prompt: string) {
  const began = performance.now();
  return new Promise<{ code: number | null; stdout: string; stderr: string; wall_ms: number; timed_out: boolean; oversized: boolean }>((done, reject) => {
    // Deliberately omit --deadline-ms and remove its two environment overrides:
    // verify the adapter's actual default without changing the caller's settings.
    const env = { ...process.env };
    delete env.OTHIE_CODEX_DEADLINE_MS;
    delete env.OTHIE_CLAUDE_CODE_DEADLINE_MS;
    const child = spawn(process.execPath, [adapterPath(host), "--cli", cliPath, "--config", config,
      "--bridge", host, "--credential-file", credential, "--max-tokens", "500", "--diagnostics-json"], { cwd, env, stdio: "pipe" });
    let stdout = "", stderr = "", timedOut = false, oversized = false, bytes = 0;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, outerTimeoutMs);
    const collect = (target: "stdout" | "stderr", chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1_000_000) { oversized = true; child.kill("SIGKILL"); return; }
      if (target === "stdout") stdout += chunk; else stderr += chunk;
    };
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => collect("stdout", chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => collect("stderr", chunk));
    child.stdin.on("error", () => {});
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); done({ code, stdout, stderr,
      wall_ms: performance.now() - began, timed_out: timedOut, oversized }); });
    child.stdin.end(JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd, prompt,
      transcript_path: "PRIVATE_TRANSCRIPT", session_id: "PRIVATE_SESSION" }));
  });
}

export async function runHookLatency(out: string, repeats = 3) {
  if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 10) throw new Error("Repeats must be between 1 and 10");
  await mkdir(out, { mode: 0o700 });
  const root = await realpath(await mkdtemp(join(tmpdir(), "othie-hook-latency-")));
  let running: Awaited<ReturnType<typeof runEngine>> | undefined;
  try {
    const docs = join(root, "docs"), state = join(root, "state"), workspace = join(root, "workspace with spaces");
    await Promise.all([mkdir(docs), mkdir(state), mkdir(workspace)]);
    await writeFile(join(docs, "canary.md"), policy);
    const config = configSchema.parse({ version: 1, data_dir: state, credentials_file: join(state, "credentials.json"),
      ingestion: { watch_enabled: false }, profiles: { company: {
        sources: [{ root: docs, role: "reference", authority_priority: 50, retrieval_weight: 1, global_rule_documents: [] }],
        permitted_exports: "rules_and_excerpts", providers: { embeddings: [], extraction: [], synthesis: [] },
        token_budget: { enabled: true, max_tokens: 500, tokenizer: "o200k_base" },
      } } });
    const configPath = join(root, "config.json"), credentials = new Map<Host, string>();
    await writeFile(configPath, JSON.stringify(config));
    for (const host of hosts) {
      const path = join(state, `${host}.credential`);
      await writeFile(path, await createCredential(config.credentials_file!, host, ["company"], "company"), { mode: 0o600 });
      credentials.set(host, path);
    }
    const artifacts = [cliPath, ...hosts.map(adapterPath), join(repository, "packages/hooks/dist/src/index.js")];
    const hashes = await Promise.all(artifacts.map(async (path) => ({ path: path.slice(repository.length),
      sha256: createHash("sha256").update(await readFile(path)).digest("hex") })));
    const protocol = { protocol_version: "hook-latency-v1", recorded_at: new Date().toISOString(), synthetic_only: true,
      platform: process.platform, node: process.version, repeats, hook_deadline_ms: hookDeadlineMs, outer_timeout_ms: outerTimeoutMs,
      context_token_cap: 500, deadline_environment_overrides: "removed from child environment", policy,
      queries: { positive, irrelevant }, compiled_artifacts: hashes,
      limitations: "Compiled adapter processes against a synthetic live engine, with extraction, embeddings and synthesis disabled. Parent wall time includes process startup and exit. No native Codex/Claude Code session, model consumption, semantic applicability, desktop UI or Windows hardware acceptance. Repeated local timings are observations, not a general latency guarantee." };
    await writeFile(join(out, "protocol.json"), JSON.stringify(protocol, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    running = await runEngine(config);
    const indexDeadline = performance.now() + 10_000;
    while (!running.engine.store.listActiveChunks("company").length) {
      if (performance.now() >= indexDeadline) throw new Error("Synthetic indexing timed out");
      await new Promise((done) => setTimeout(done, 50));
    }
    const records = [];
    for (const condition of ["positive", "irrelevant", "revoked", "unavailable"] as const) {
      if (condition === "revoked") for (const host of hosts) await revokeCredential(config.credentials_file!, host);
      if (condition === "unavailable") { await running!.close(); running = undefined; }
      for (let repeat = 1; repeat <= repeats; repeat++) for (const host of repeat % 2 ? hosts : [...hosts].reverse()) {
        const response = await invoke(host, configPath, credentials.get(host)!, workspace, condition === "irrelevant" ? irrelevant : positive);
        let diagnostics: Record<string, unknown> | null = null, context: string | null = null;
        try { diagnostics = JSON.parse(response.stderr); } catch { /* Preserve failed output. */ }
        try { context = JSON.parse(response.stdout).hookSpecificOutput.additionalContext; } catch { /* Empty is expected for no-ops. */ }
        const expected = condition === "positive" ? "injected" : condition === "irrelevant" ? "empty" : "context_unavailable";
        const delivery = diagnostics?.host === host && diagnostics?.outcome === expected && (condition === "positive"
          ? typeof context === "string" && context.includes(policy) && context.includes('source="s1/canary.md"')
          : response.stdout === "");
        const latency = response.wall_ms < hookDeadlineMs;
        const record = { host, condition, repeat, ...response, diagnostics, delivery_passed: delivery, hook_deadline_met: latency,
          passed: delivery && latency && response.code === 0 && !response.timed_out && !response.oversized };
        await writeFile(join(out, `${condition}-${host}-${repeat}.json`), JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        records.push(record);
      }
    }
    const summary = { ...protocol, passed: records.every((row) => row.passed), records };
    await writeFile(join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return summary;
  } finally { await running?.close(); await rm(root, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const values = evaluationArguments(process.argv.slice(2), ["out", "repeats"], "default hook latency");
    const out = resolve(values.get("out") ?? `packages/engine/evaluation/results/hook-latency-${Date.now()}`);
    await mkdir(resolve(out, ".."), { recursive: true });
    const report = await runHookLatency(out, Number(values.get("repeats") ?? 3));
    process.stdout.write(JSON.stringify({ report: join(out, "summary.json"), passed: report.passed }) + "\n");
    if (!report.passed) process.exitCode = 1;
  } catch { process.stderr.write("Hook latency evaluation failed; check arguments and any preserved records.\n"); process.exitCode = 1; }
}
