import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { countTokens as countO200k } from "gpt-tokenizer/encoding/o200k_base";
import { countTokens as countCl100k } from "gpt-tokenizer/encoding/cl100k_base";

export type HookHost = "codex" | "claude-code";
export interface ContextQuery {
  query: string;
  workspaceRoot: string;
  surface: "code";
  phase: "turn_start";
  host: HookHost;
  maxTokens: number;
}
export interface HookOptions {
  cliPath: string;
  configPath: string;
  bridgeId: string;
  credentialFile: string;
  maxTokens: number;
  deadlineMs: number;
}
export interface HookDependencies {
  query: (request: ContextQuery, signal: AbortSignal) => Promise<unknown>;
}
export interface HookRunResult { stdout: string; stderr: string }

const MAX_INPUT_BYTES = 1_000_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const labels: Record<HookHost, string> = { codex: "Codex", "claude-code": "Claude Code" };
type Diagnostic = "invalid_event" | "invalid_options" | "invalid_context_response" | "context_unavailable" | "context_timeout";
const diagnostic = (host: HookHost, code: Diagnostic) => `Othie ${labels[host]} hook: ${code}\n`;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const nonnegativeInteger = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;

function isCitation(value: unknown): boolean {
  if (!isRecord(value) || !nonempty(value.source) || !nonempty(value.at)) return false;
  const safeSource = /^unmapped\/[a-f0-9]{12}$/.test(value.source) || (
    /^s\d+\/.+/.test(value.source) && !value.source.includes("\\") &&
    value.source.split("/").every((part) => part !== "." && part !== ".." && part !== "")
  );
  return safeSource && (value.quote === undefined || nonempty(value.quote));
}

interface ValidResult { text: string; brief: Record<string, unknown> }
function validContextResult(value: unknown, request: ContextQuery): value is ValidResult {
  if (!isRecord(value) || !nonempty(value.text) || Buffer.byteLength(value.text) > MAX_OUTPUT_BYTES || !isRecord(value.brief)) return false;
  const brief = value.brief;
  if (brief.schema_version !== "1" || brief.context_text !== value.text || !isRecord(brief.request) ||
      brief.request.surface !== request.surface || brief.request.phase !== request.phase || brief.request.host !== request.host ||
      brief.request.workspace_root !== request.workspaceRoot || !isRecord(brief.status)) return false;
  const status = brief.status;
  if (!["deterministic", "synthesized", "fallback", "empty"].includes(String(status.mode))) return false;
  if (!["tokenCount", "omittedItems", "conflicts", "corpusRevision", "ruleRevision"].every((field) => nonnegativeInteger(status[field]))) return false;
  if (!nonempty(status.profile) || !["tokenizerEstimate", "keywordAvailable", "vectorAvailable", "synthesisAttempted"].every((field) => typeof status[field] === "boolean")) return false;
  if (status.tokenizer !== "o200k_base" && status.tokenizer !== "cl100k_base") return false;
  const measured = status.tokenizer === "o200k_base" ? countO200k(value.text) : countCl100k(value.text);
  if (measured !== status.tokenCount || measured > request.maxTokens) return false;
  // When the CLI supplies top-level status, it must agree with the packed brief.
  if (value.status !== undefined && (!isRecord(value.status) || Object.keys(status).some((key) => status[key] !== (value.status as Record<string, unknown>)[key]))) return false;
  if (!Array.isArray(brief.applicable_rules) || !brief.applicable_rules.every((item) => isRecord(item) && nonempty(item.id) && nonempty(item.text) &&
      nonempty(item.category) && nonempty(item.scope) && typeof item.authority === "number" && Number.isFinite(item.authority) && isCitation(item.citation))) return false;
  if (!Array.isArray(brief.permitted_excerpts) || !brief.permitted_excerpts.every((item) => isRecord(item) && nonempty(item.id) && nonempty(item.text) && isCitation(item.citation))) return false;
  if (brief.synthesis !== undefined && (!isRecord(brief.synthesis) || !nonempty(brief.synthesis.text) || !Array.isArray(brief.synthesis.citations) ||
      !brief.synthesis.citations.length || !brief.synthesis.citations.every(isCitation))) return false;
  if (![brief.external_facts, brief.navigation_hints, brief.verification_checks].every((items) => Array.isArray(items) && items.length === 0)) return false;
  if (!Array.isArray(brief.conflicts) || brief.conflicts.length !== status.conflicts || !brief.conflicts.every((item) => isRecord(item) &&
      item.detection === "explicit_opposition_only" && Array.isArray(item.rule_ids) && item.rule_ids.length > 1 && item.rule_ids.every(nonempty))) return false;
  const hasItems = brief.applicable_rules.length > 0 || brief.permitted_excerpts.length > 0 || brief.synthesis !== undefined;
  return (status.mode === "empty") === !hasItems && (status.mode === "synthesized") === (brief.synthesis !== undefined);
}

function parseEvent(raw: string): { prompt: string; cwd: string } | undefined {
  if (Buffer.byteLength(raw) > MAX_INPUT_BYTES) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.hook_event_name !== "UserPromptSubmit" || !nonempty(value.prompt) || !nonempty(value.cwd)) return undefined;
    return { prompt: value.prompt, cwd: value.cwd };
  } catch { return undefined; }
}

export async function runPromptHook(host: HookHost, rawInput: string, options: HookOptions, dependencies?: HookDependencies): Promise<HookRunResult> {
  const event = parseEvent(rawInput);
  if (!event) return { stdout: "", stderr: diagnostic(host, "invalid_event") };
  if (!Number.isSafeInteger(options.maxTokens) || options.maxTokens <= 0 || !Number.isSafeInteger(options.deadlineMs) || options.deadlineMs <= 0 || options.deadlineMs > 2_147_483_647) {
    return { stdout: "", stderr: diagnostic(host, "invalid_options") };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.deadlineMs);
  const deadline = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("deadline")), { once: true }));
  try {
    const request: ContextQuery = { query: event.prompt, workspaceRoot: event.cwd, surface: "code", phase: "turn_start", host, maxTokens: options.maxTokens };
    const result = await Promise.race([(dependencies?.query ?? ((query, signal) => queryThroughCli(query, options, signal)))(request, controller.signal), deadline]);
    if (!validContextResult(result, request)) return { stdout: "", stderr: diagnostic(host, "invalid_context_response") };
    if ((result.brief.status as Record<string, unknown>).mode === "empty") return { stdout: "", stderr: "" };
    const additionalContext = `Othie context brief (source-backed; preserve the included citations):\n${result.text}`;
    return { stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } })}\n`, stderr: "" };
  } catch {
    return { stdout: "", stderr: diagnostic(host, controller.signal.aborted ? "context_timeout" : "context_unavailable") };
  } finally { clearTimeout(timer); }
}

export async function queryThroughCli(request: ContextQuery, options: HookOptions, signal: AbortSignal): Promise<unknown> {
  signal.throwIfAborted();
  return new Promise((resolvePromise, reject) => {
    const args = [options.cliPath, "query", "--config", options.configPath, "--bridge", options.bridgeId, "--credential-file", options.credentialFile,
      "--query-stdin", "--max-tokens", String(request.maxTokens), "--surface", request.surface, "--phase", request.phase, "--host", request.host, "--workspace-root", request.workspaceRoot, "--json"];
    const child = spawn(process.execPath, args, { stdio: ["pipe", "pipe", "ignore"], shell: false });
    let stdout = "", outputBytes = 0, settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback();
    };
    const onAbort = () => { child.kill("SIGKILL"); finish(() => reject(new Error("deadline"))); };
    signal.addEventListener("abort", onAbort, { once: true });
    child.on("error", () => finish(() => reject(new Error("unavailable"))));
    child.stdin.on("error", () => {});
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > MAX_OUTPUT_BYTES) { child.kill("SIGKILL"); finish(() => reject(new Error("oversized"))); return; }
      stdout += chunk;
    });
    child.on("close", (code) => finish(() => {
      if (code !== 0) { reject(new Error("failed")); return; }
      try { resolvePromise(JSON.parse(stdout) as unknown); } catch { reject(new Error("invalid")); }
    }));
    child.stdin.end(request.query);
  });
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647 ? parsed : fallback;
}
export function hookOptionsFromProcess(host: HookHost, entryUrl: string): HookOptions {
  const sourceDefault = new URL(entryUrl.includes("/dist/") ? "../../../../packages/engine/dist/src/cli.js" : "../../../packages/engine/dist/src/cli.js", entryUrl);
  const envPrefix = host === "codex" ? "OTHIE_CODEX" : "OTHIE_CLAUDE_CODE";
  return {
    cliPath: resolve(arg("cli") ?? fileURLToPath(sourceDefault)),
    configPath: resolve(arg("config") ?? process.env.OTHIE_CONFIG ?? "config.json"),
    bridgeId: arg("bridge") ?? process.env.OTHIE_BRIDGE_ID ?? host,
    credentialFile: resolve(arg("credential-file") ?? process.env.OTHIE_BRIDGE_CREDENTIAL_FILE ?? `.othie/bridge-${host}.credential`),
    maxTokens: positiveInteger(arg("max-tokens") ?? process.env[`${envPrefix}_MAX_TOKENS`], 500),
    deadlineMs: positiveInteger(arg("deadline-ms") ?? process.env[`${envPrefix}_DEADLINE_MS`], 2000),
  };
}

class HookInputError extends Error {
  constructor(readonly code: Diagnostic) { super(code); }
}

function readHookStdin(deadlineMs: number): Promise<string> {
  return new Promise((resolveInput, reject) => {
    let raw = "", bytes = 0;
    const timer = setTimeout(() => finish(new HookInputError("context_timeout")), deadlineMs);
    const finish = (error?: Error) => {
      clearTimeout(timer);
      process.stdin.off("data", onData).off("end", onEnd).off("error", onError);
      process.stdin.pause();
      if (error) reject(error); else resolveInput(raw);
    };
    const onData = (chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_INPUT_BYTES) { finish(new HookInputError("invalid_event")); return; }
      raw += chunk;
    };
    const onEnd = () => finish();
    const onError = () => finish(new HookInputError("context_unavailable"));
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", onData).once("end", onEnd).once("error", onError);
  });
}

export async function hookMain(host: HookHost, entryUrl: string): Promise<void> {
  try {
    const options = hookOptionsFromProcess(host, entryUrl), started = performance.now();
    const raw = await readHookStdin(options.deadlineMs);
    const remainingMs = Math.floor(options.deadlineMs - (performance.now() - started));
    const result = remainingMs > 0 ? await runPromptHook(host, raw, { ...options, deadlineMs: remainingMs }) : { stdout: "", stderr: diagnostic(host, "context_timeout") };
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  } catch (error) {
    process.stderr.write(diagnostic(host, error instanceof HookInputError ? error.code : "context_unavailable"));
  }
}
