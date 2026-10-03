import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { configSchema } from "../config.js";
import { createCredential, revokeCredential } from "../engine/credentials.js";
import { runEngine } from "../engine/lifecycle.js";

export type NativeHost = "codex" | "claude-code";
export function shellQuote(value: string): string { return `'${value.replaceAll("'", "'\\''")}'`; }
async function processOutput(command: string, args: string[], cwd: string, timeoutMs = 120_000) {
  return new Promise<{ code: number | null; stdout: string; stderr: string; timed_out: boolean }>((done, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; if (stdout.length > 2_000_000) child.kill("SIGKILL"); });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; if (stderr.length > 2_000_000) child.kill("SIGKILL"); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); done({ code, stdout, stderr, timed_out: timedOut }); });
  });
}

// Keep the host event's private session/transcript fields out of the acceptance record.
// Forward the actual host event to the compiled adapter unchanged.
export function recordingWrapper(adapterArgs: string[], receipt: string): string {
  return `import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
let event = '';
for await (const chunk of process.stdin) event += chunk;
const child = spawn(${JSON.stringify(process.execPath)}, ${JSON.stringify(adapterArgs)}, {stdio:'pipe'});
let stdout = '', stderr = '';
child.stdout.setEncoding('utf8').on('data', chunk => stdout += chunk);
child.stderr.setEncoding('utf8').on('data', chunk => stderr += chunk);
child.stdin.on('error', () => {});
child.on('error', () => process.exitCode = 1);
child.on('close', async code => {
  const input = JSON.parse(event);
  await writeFile(${JSON.stringify(receipt)}, JSON.stringify({event: input.hook_event_name, input_fields: Object.keys(input).sort(), stdout, stderr, code}), {mode:0o600});
  process.stdout.write(stdout); process.stderr.write(stderr); process.exitCode = code ?? 1;
});
child.stdin.end(event);
`;
}

export async function runNativeHookAcceptance(host: NativeHost, out: string, localModel?: string) {
  if (process.platform === "win32" && host === "codex") throw new Error("Windows Codex command quoting needs native acceptance before use");
  await mkdir(out, { mode: 0o700 });
  const root = await realpath(await mkdtemp(join(tmpdir(), "othie-native-hook-")));
  const workspace = join(root, "workspace with spaces"), docs = join(root, "docs"), state = join(root, "state");
  await mkdir(workspace); await mkdir(docs); await mkdir(state);
  await writeFile(join(docs, "canary.md"), "Canary enterprise support policy requires the first response within eleven hours on weekends. This is a first-response target, not a resolution deadline.\n");
  const config = configSchema.parse({ version: 1, data_dir: state, credentials_file: join(state, "credentials.json"),
    ingestion: { watch_enabled: false }, profiles: { company: {
      sources: [{ root: docs, role: "reference", authority_priority: 50, retrieval_weight: 1, global_rule_documents: [] }],
      permitted_exports: "rules_and_excerpts", providers: { embeddings: [], extraction: [], synthesis: [] },
      token_budget: { enabled: true, max_tokens: 500, tokenizer: "o200k_base" },
    } } });
  const configPath = join(root, "config.json"), credentialPath = join(state, "host.credential");
  await writeFile(configPath, JSON.stringify(config));
  await writeFile(credentialPath, await createCredential(config.credentials_file!, host, ["company"], "company"), { mode: 0o600 });
  const repository = fileURLToPath(new URL("../../../../../", import.meta.url));
  const adapter = join(repository, "integrations", host, "dist/src/user-prompt-submit.js");
  const cli = fileURLToPath(new URL("../cli.js", import.meta.url));
  const receiptPath = join(root, "receipt.json"), wrapperPath = join(root, "record-hook.mjs");
  const adapterArgs = [adapter, "--cli", cli, "--config", configPath, "--bridge", host, "--credential-file", credentialPath,
    "--max-tokens", "500", "--deadline-ms", "2000", "--diagnostics-json"];
  await writeFile(wrapperPath, recordingWrapper(adapterArgs, receiptPath));
  const handler = host === "codex"
    ? { type: "command", command: [process.execPath, wrapperPath].map(shellQuote).join(" "), timeout: 3, additionalContextLimit: 600 }
    : { type: "command", command: process.execPath, args: [wrapperPath], timeout: 3 };
  const hooks = { hooks: { UserPromptSubmit: [{ hooks: [handler] }] } };
  const settingsPath = join(root, "settings.json"), mcpPath = join(root, "mcp.json");
  await writeFile(settingsPath, JSON.stringify(hooks)); await writeFile(mcpPath, JSON.stringify({ mcpServers: {} }));
  if (host === "codex") {
    await mkdir(join(workspace, ".codex"));
    // Supply the inspected hook as an invocation-local config layer.
    // No persisted global hook trust or host configuration is changed.
    await writeFile(join(workspace, ".codex", "config.toml"), "");
    const init = await processOutput("git", ["init", "--quiet"], workspace);
    if (init.code !== 0) throw new Error("Could not initialize isolated acceptance repository");
  }
  const executable = host === "codex" ? "codex" : "claude";
  const version = await processOutput(executable, ["--version"], workspace, 10_000);
  let running: Awaited<ReturnType<typeof runEngine>> | undefined;
  const records: Array<Record<string, unknown>> = [];
  try {
    running = await runEngine(config);
    const deadline = Date.now() + 10_000;
    while (!running.engine.store.listActiveChunks("company").length) {
      if (Date.now() > deadline) throw new Error("Synthetic indexing timed out");
      await new Promise((done) => setTimeout(done, 50));
    }
    for (const condition of ["positive", "irrelevant", "revoked", "unavailable"] as const) {
      if (condition === "revoked") await revokeCredential(config.credentials_file!, host);
      if (condition === "unavailable") { await running!.close(); running = undefined; }
      await rm(receiptPath, { force: true });
      const prompt = condition === "irrelevant"
        ? "The repository function double(n) returns n * 2. What is double(21)? Reply with the number only. Do not use tools."
        : "According to Canary enterprise support policy, what is the weekend first-response target in hours? Use only supplied context; if missing reply unknown. Reply with the number only. Do not use tools.";
      const args = host === "codex"
        ? ["exec", "--ignore-user-config", "--ephemeral", "--json", "--sandbox", "read-only", "--dangerously-bypass-hook-trust",
          "-c", `projects.${JSON.stringify(workspace)}.trust_level=\"trusted\"`,
          "-c", `hooks.UserPromptSubmit=[{hooks=[{type=\"command\",command=${JSON.stringify((handler as {command: string}).command)},timeout=3,additionalContextLimit=600}]}]`,
          "--disable", "plugins", "--enable", "skip_host_skill_discovery",
          ...(localModel ? ["--oss", "--local-provider", "ollama", "--model", localModel] : []), prompt]
        : ["--print", "--verbose", "--output-format", "stream-json", "--include-hook-events", "--no-session-persistence",
          "--setting-sources", "project,local", "--settings", settingsPath, "--strict-mcp-config", "--mcp-config", mcpPath,
          "--tools", "", "--permission-mode", "dontAsk", "--max-budget-usd", "2", prompt];
      const response = await processOutput(executable, args, workspace);
      const receipt = await readFile(receiptPath, "utf8").then((text) => JSON.parse(text) as { event: string; stdout: string; stderr: string; code: number }, () => null);
      const events = response.stdout.split("\n").filter(Boolean).flatMap((line) => { try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; } });
      const answers = events.flatMap((event) => {
        const item = event.item as { type?: string; text?: string } | undefined;
        if (item?.type === "agent_message" && item.text) return [item.text];
        if (event.type === "result" && typeof event.result === "string") return [event.result];
        return [];
      });
      const answer = answers.at(-1)?.trim().toLowerCase().replace(/[.!]$/, "") ?? null;
      const expected = condition === "positive" ? "11" : condition === "irrelevant" ? "42" : "unknown";
      let outcome: string | null = null;
      try { outcome = receipt ? JSON.parse(receipt.stderr).outcome as string : null; } catch { /* Failed adapters are recorded, never accepted. */ }
      const delivery = condition === "positive" ? outcome === "injected" && receipt?.stdout.includes("eleven hours")
        : outcome === (condition === "irrelevant" ? "empty" : "context_unavailable") && receipt?.stdout === "";
      const redact = (text: string) => text.replaceAll(root, "<temporary-fixture>").replaceAll(repository, "<othie-repository>");
      const record = { host, condition, prompt, expected, answer, response: { ...response, stdout: redact(response.stdout), stderr: redact(response.stderr) },
        receipt, delivery_passed: !!delivery, passed: !!delivery && response.code === 0 && !response.timed_out && answer === expected };
      await writeFile(join(out, `${condition}.json`), JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      records.push(record);
      process.stderr.write(`Native ${host} / ${condition}: delivery=${!!delivery}, answer=${answer === expected}\n`);
    }
    const report = { recorded_at: new Date().toISOString(), synthetic_only: true, platform: process.platform, node: process.version,
      host, host_version: version.stdout.trim(), model: localModel ?? "host default", context_token_cap: 500,
      trust: host === "codex" ? "Invocation-local generated hook; one-shot trust bypass; user config ignored; plugins disabled; experimental host-skill-discovery suppression" : "Explicit generated settings; no tools; no global settings changed",
      limitations: "Native noninteractive CLI sessions only. Does not establish desktop UI trust, Windows behavior, startup, model quality, or installer acceptance.",
      passed: records.every((record) => record.passed), records: records.map(({ response, receipt, ...record }) => record) };
    await writeFile(join(out, "summary.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return report;
  } finally { await running?.close(); await rm(root, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argument = (name: string) => { const index = process.argv.indexOf(`--${name}`); return index < 0 ? undefined : process.argv[index + 1]; };
  const host = argument("host");
  if (host !== "codex" && host !== "claude-code") throw new Error("--host must be codex or claude-code");
  const out = resolve(argument("out") ?? `packages/engine/evaluation/results/native-${host}-${Date.now()}`);
  await mkdir(resolve(out, ".."), { recursive: true });
  void runNativeHookAcceptance(host, out, argument("local-model")).then((report) => {
    process.stdout.write(JSON.stringify({ report: join(out, "summary.json"), passed: report.passed }) + "\n");
    if (!report.passed) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Native hook acceptance failed; inspect preserved records.\n"); process.exitCode = 1; });
}
