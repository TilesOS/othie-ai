import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { configSchema } from "../config.js";
import { createCredential, revokeCredential } from "../engine/credentials.js";
import { runEngine } from "../engine/lifecycle.js";

export type NativeHost = "codex" | "claude-code";
export type CodexHooks = "session" | "project";
export type ClaudeSettings = "explicit" | "project" | "local";
export type LaunchDirectory = "root" | "nested";
export function nativeHookArguments(argv: string[]): ReadonlyMap<string, string> {
  const allowed = new Set(["host", "out", "codex-hooks", "claude-settings", "launch-directory", "local-model"]);
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]!, name = flag.slice(2), value = argv[index + 1];
    if (!flag.startsWith("--") || !allowed.has(name)) throw new Error(`Unknown native acceptance argument: ${flag}`);
    if (values.has(name)) throw new Error(`Duplicate native acceptance argument: ${flag}`);
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    values.set(name, value);
  }
  return values;
}

type NativeCondition = "positive" | "irrelevant" | "revoked" | "unavailable";
type HookReceipt = { event: string; model?: string | null; stdout: string; stderr: string; code: number };
const canaryPolicy = "Canary enterprise support policy requires the first response within eleven hours on weekends. This is a first-response target, not a resolution deadline.";

// Native hosts can report account utilization and encoded private paths even in
// synthetic sessions. Redact structured metadata before retaining transcripts.
export function redactNativeTranscript(text: string, paths: ReadonlyArray<readonly [string, string]>): string {
  const privateFields = new Set(["session_id", "thread_id", "turn_id", "uuid", "hook_id", "request_id", "memory_paths", "messaging_socket_path", "rate_limit_info"]);
  const redactPaths = (value: string) => {
    for (const [path, replacement] of paths) value = value.replaceAll(path, replacement);
    return value;
  };
  const redact = (value: unknown): unknown => {
    if (typeof value === "string") return redactPaths(value);
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
      [key, privateFields.has(key) ? "<redacted>" : redact(entry)]));
    return value;
  };
  return text.split("\n").map((line) => {
    try { return JSON.stringify(redact(JSON.parse(line))); } catch { return redactPaths(line); }
  }).join("\n");
}

export function nativeHookDelivery(host: NativeHost, condition: NativeCondition, receipt: HookReceipt | null): boolean {
  if (!receipt || receipt.code !== 0 || receipt.event !== "UserPromptSubmit") return false;
  try {
    const diagnostics = JSON.parse(receipt.stderr);
    const expected = condition === "positive" ? "injected" : condition === "irrelevant" ? "empty" : "context_unavailable";
    if (diagnostics.host !== host || diagnostics.outcome !== expected) return false;
    if (condition !== "positive") return receipt.stdout === "";
    const output = JSON.parse(receipt.stdout).hookSpecificOutput;
    return output.hookEventName === "UserPromptSubmit" && typeof output.additionalContext === "string"
      && output.additionalContext.includes(canaryPolicy) && output.additionalContext.includes('source="s1/canary.md"');
  } catch { return false; }
}

// Discovery modes deliberately omit --settings: otherwise a passing run could be
// supplied by the explicit override rather than the file under test.
export function claudeSettingsConfiguration(mode: ClaudeSettings, workspace: string, explicitPath: string) {
  return {
    path: mode === "explicit" ? explicitPath : join(workspace, ".claude", mode === "project" ? "settings.json" : "settings.local.json"),
    args: ["--setting-sources", "project,local", ...(mode === "explicit" ? ["--settings", explicitPath] : [])],
    location: mode === "explicit" ? "explicit-settings" : `.claude/${mode === "project" ? "settings.json" : "settings.local.json"}`,
  };
}

// Project layers are gated on trust in the user config, before session overrides
// are applied. Use a private disposable home rather than altering the real one.
export async function createCodexProjectHome(home: string, workspace: string, authenticationHome?: string): Promise<void> {
  await mkdir(home, { mode: 0o700 });
  await writeFile(join(home, "config.toml"), `[projects.${JSON.stringify(workspace)}]\ntrust_level = "trusted"\n`, { flag: "wx", mode: 0o600 });
  if (authenticationHome) {
    const authentication = await readFile(join(authenticationHome, "auth.json"));
    await writeFile(join(home, "auth.json"), authentication, { flag: "wx", mode: 0o600 });
  }
}

export function codexHookConfiguration(mode: CodexHooks, command: string) {
  return {
    args: mode === "session" ? ["--ignore-user-config", "-c",
      `hooks.UserPromptSubmit=[{hooks=[{type="command",command=${JSON.stringify(command)},timeout=3,additionalContextLimit=600}]}]`] : [],
    trust: `${mode === "session" ? "Invocation-local generated hook; user config ignored" : "Project-file generated hook; project trust in disposable Codex home; existing file login copied only for hosted sessions"}; one-shot hook trust bypass; plugins disabled; experimental host-skill-discovery suppression`,
  };
}

export function shellQuote(value: string): string { return `'${value.replaceAll("'", "'\\''")}'`; }
async function processOutput(command: string, args: string[], cwd: string, timeoutMs = 120_000, environment: NodeJS.ProcessEnv = {}) {
  return new Promise<{ code: number | null; stdout: string; stderr: string; timed_out: boolean }>((done, reject) => {
    // Keep a native acceptance session independent of the calling desktop thread.
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("CODEX_") || name === "CODEX_HOME"));
    const child = spawn(command, args, { cwd, env: { ...env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
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
  await writeFile(${JSON.stringify(receipt)}, JSON.stringify({event: input.hook_event_name, input_fields: Object.keys(input).sort(), model: typeof input.model === 'string' ? input.model : null, stdout, stderr, code}), {mode:0o600});
  process.stdout.write(stdout); process.stderr.write(stderr); process.exitCode = code ?? 1;
});
child.stdin.end(event);
`;
}

export async function runNativeHookAcceptance(host: NativeHost, out: string, localModel?: string, codexHooks: CodexHooks = "session",
  options: { claudeSettings?: ClaudeSettings; launchDirectory?: LaunchDirectory } = {}) {
  if (process.platform === "win32" && host === "codex") throw new Error("Windows Codex command quoting needs native acceptance before use");
  await mkdir(out, { mode: 0o700 });
  const root = await realpath(await mkdtemp(join(tmpdir(), "othie-native-hook-")));
  let running: Awaited<ReturnType<typeof runEngine>> | undefined;
  try {
  const workspace = join(root, "workspace with spaces"), docs = join(root, "docs"), state = join(root, "state");
  await mkdir(workspace); await mkdir(docs); await mkdir(state);
  const launchDirectory = options.launchDirectory ?? "root";
  const cwd = launchDirectory === "nested" ? join(workspace, "src", "nested directory") : workspace;
  await mkdir(cwd, { recursive: true });
  await writeFile(join(docs, "canary.md"), canaryPolicy + "\n");
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
  const claudeSettings = claudeSettingsConfiguration(options.claudeSettings ?? "explicit", workspace, settingsPath);
  if (host === "claude-code") {
    await mkdir(resolve(claudeSettings.path, ".."), { recursive: true });
    await writeFile(claudeSettings.path, JSON.stringify(hooks));
  }
  await writeFile(mcpPath, JSON.stringify({ mcpServers: {} }));
  // Both hosts discover the project root from an actual isolated repository.
  const init = await processOutput("git", ["init", "--quiet"], workspace);
  if (init.code !== 0) throw new Error("Could not initialize isolated acceptance repository");
  if (host === "codex") {
    await mkdir(join(workspace, ".codex"));
    if (codexHooks === "project") await writeFile(join(workspace, ".codex", "hooks.json"), JSON.stringify(hooks));
    // No persisted global hook trust or host configuration is changed.
    await writeFile(join(workspace, ".codex", "config.toml"), "");
  }
  const codexConfiguration = codexHookConfiguration(codexHooks, handler.command);
  const codexHome = host === "codex" && codexHooks === "project" ? join(root, "codex-home") : undefined;
  if (codexHome) await createCodexProjectHome(codexHome, workspace,
    localModel ? undefined : process.env.CODEX_HOME ?? join(homedir(), ".codex"));
  const executable = host === "codex" ? "codex" : "claude";
  const version = await processOutput(executable, ["--version"], workspace, 10_000);
  if (version.code !== 0 || version.timed_out) throw new Error("Could not identify native host version");
  const compiledArtifacts = await Promise.all([adapter, cli, join(repository, "packages/hooks/dist/src/index.js")].map(async (path) => ({
    path: path.slice(repository.length), sha256: createHash("sha256").update(await readFile(path)).digest("hex"),
  })));
  const protocol = { protocol: "native-hooks-v3", recorded_at: new Date().toISOString(), synthetic_only: true,
    platform: process.platform, node: process.version, host, host_version: version.stdout.trim(),
    hook_configuration: host === "codex" ? codexHooks : claudeSettings.location, launch_directory: launchDirectory,
    settings_sources: host === "claude-code" ? ["project", "local"] : null,
    codex_home: host === "codex" ? codexHome ? "disposable-project-trust" : "existing-login-user-config-ignored" : null,
    requested_model: localModel ?? "host default", context_token_cap: 500,
    policy: canaryPolicy, compiled_artifacts: compiledArtifacts,
    hook_adapter_sha256: createHash("sha256").update(await readFile(adapter)).digest("hex"),
    limitations: "Native noninteractive CLI sessions only. Does not establish interactive or desktop UI trust, Windows behavior, startup, model quality, or installer acceptance." };
  await writeFile(join(out, "protocol.json"), JSON.stringify(protocol, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  const records: Array<Record<string, unknown>> = [];
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
        ? ["exec", "--ephemeral", "--json", "--sandbox", "read-only", "--dangerously-bypass-hook-trust",
          ...codexConfiguration.args,
          "--disable", "plugins", "--enable", "skip_host_skill_discovery",
          ...(localModel ? ["--oss", "--local-provider", "ollama", "--model", localModel] : []), prompt]
        : ["--print", "--verbose", "--output-format", "stream-json", "--include-hook-events", "--no-session-persistence",
          ...claudeSettings.args, "--strict-mcp-config", "--mcp-config", mcpPath,
          "--tools", "", "--permission-mode", "dontAsk", "--max-budget-usd", "2", prompt];
      const started = performance.now();
      const response = await processOutput(executable, args, cwd, 120_000, codexHome ? { CODEX_HOME: codexHome } : {});
      const elapsedMs = performance.now() - started;
      const receipt = await readFile(receiptPath, "utf8").then((text) => JSON.parse(text) as HookReceipt, () => null);
      const events = response.stdout.split("\n").filter(Boolean).flatMap((line) => { try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; } });
      const answers = events.flatMap((event) => {
        const item = event.item as { type?: string; text?: string } | undefined;
        if (item?.type === "agent_message" && item.text) return [item.text];
        if (event.type === "result" && typeof event.result === "string") return [event.result];
        return [];
      });
      const answer = answers.at(-1)?.trim().toLowerCase().replace(/[.!]$/, "") ?? null;
      const expected = condition === "positive" ? "11" : condition === "irrelevant" ? "42" : "unknown";
      const delivery = nativeHookDelivery(host, condition, receipt);
      const redact = (text: string) => redactNativeTranscript(text, [[root, "<temporary-fixture>"], [repository, "<othie-repository>"], [homedir(), "<user-home>"]]);
      const hostModel = receipt?.model ?? events.find((event) => event.type === "system" && event.subtype === "init")?.model ?? null;
      const record = { host, host_model: hostModel, condition, prompt, expected, answer, elapsed_ms: elapsedMs, response: { ...response, stdout: redact(response.stdout), stderr: redact(response.stderr) },
        receipt, delivery_passed: !!delivery, passed: !!delivery && response.code === 0 && !response.timed_out && answer === expected };
      await writeFile(join(out, `${condition}.json`), JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      records.push(record);
      process.stderr.write(`Native ${host} / ${condition}: delivery=${!!delivery}, answer=${answer === expected}\n`);
    }
    const report = { ...protocol,
      observed_models: [...new Set(records.map((record) => record.host_model).filter(Boolean))],
      trust: host === "codex" ? codexConfiguration.trust : "Generated isolated settings; noninteractive workspace trust; no tools; user settings excluded",
      passed: records.every((record) => record.passed), records: records.map(({ response, receipt, ...record }) => record) };
    await writeFile(join(out, "summary.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return report;
  } finally { await running?.close(); await rm(root, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const values = nativeHookArguments(process.argv.slice(2));
  const argument = (name: string) => values.get(name);
  const host = argument("host");
  if (host !== "codex" && host !== "claude-code") throw new Error("--host must be codex or claude-code");
  const out = resolve(argument("out") ?? `packages/engine/evaluation/results/native-${host}-${Date.now()}`);
  const codexHooks = argument("codex-hooks") ?? "session";
  if (codexHooks !== "session" && codexHooks !== "project") throw new Error("--codex-hooks must be session or project");
  const claudeSettings = argument("claude-settings") ?? "explicit";
  if (claudeSettings !== "explicit" && claudeSettings !== "project" && claudeSettings !== "local") throw new Error("--claude-settings must be explicit, project or local");
  const launchDirectory = argument("launch-directory") ?? "root";
  if (launchDirectory !== "root" && launchDirectory !== "nested") throw new Error("--launch-directory must be root or nested");
  if (host !== "claude-code" && argument("claude-settings")) throw new Error("--claude-settings requires --host claude-code");
  if (host !== "codex" && (argument("codex-hooks") || argument("local-model"))) throw new Error("--codex-hooks and --local-model require --host codex");
  await mkdir(resolve(out, ".."), { recursive: true });
  void runNativeHookAcceptance(host, out, argument("local-model"), codexHooks, { claudeSettings, launchDirectory }).then((report) => {
    process.stdout.write(JSON.stringify({ report: join(out, "summary.json"), passed: report.passed }) + "\n");
    if (!report.passed) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Native hook acceptance failed; inspect preserved records.\n"); process.exitCode = 1; });
}
