import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { runPromptHook, type HookHost, type HookOptions } from "../src/index.js";

const options: HookOptions = { cliPath: "/unused", configPath: "/unused", bridgeId: "fixture", credentialFile: "/unused", maxTokens: 500, deadlineMs: 100 };
const event = JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "PRIVATE_PROMPT", cwd: "/workspace", transcript_path: "PRIVATE_TRANSCRIPT", session_id: "PRIVATE_SESSION" });
async function fixture(host: HookHost = "codex", name = "relevant-result"): Promise<any> {
  const value = JSON.parse(await readFile(new URL(`../../../integrations/codex/test/fixtures/${name}.json`, import.meta.url), "utf8"));
  value.brief.request.host = host;
  return value;
}
const run = (value: unknown, overrides: Partial<HookOptions> = {}) => runPromptHook("codex", event, { ...options, ...overrides }, { query: async () => value });

describe("shared prompt-hook safety", () => {
  it.each(["codex", "claude-code"] as const)("uses the same cited delivery contract for %s", async (host) => {
    const query = vi.fn(async () => fixture(host));
    const result = await runPromptHook(host, event, options, { query });
    expect(query.mock.calls[0]).toEqual([{ query: "PRIVATE_PROMPT", workspaceRoot: "/workspace", surface: "code", phase: "turn_start", host, maxTokens: 500 }, expect.any(AbortSignal)]);
    const output = JSON.parse(result.stdout);
    expect(output).toEqual({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: expect.stringContaining('source="s1/support.md"') } });
    expect(result.stderr).toBe("");
    expect(result.stdout).not.toMatch(/PRIVATE_TRANSCRIPT|PRIVATE_SESSION|PRIVATE_PROMPT/);
  });

  it("rejects accurately counted context above the requested cap", async () => {
    const value = await fixture();
    expect((await run(value, { maxTokens: value.brief.status.tokenCount - 1 })).stderr).toContain("invalid_context_response");
  });

  it.each([
    ["a fabricated low token count", (value: any) => { value.brief.status.tokenCount = 1; }],
    ["a mismatched workspace", (value: any) => { value.brief.request.workspace_root = "/another-workspace"; }],
    ["a mismatched host", (value: any) => { value.brief.request.host = "claude-code"; }],
    ["a changed text envelope", (value: any) => { value.text = "PRIVATE_RETURNED_CONTEXT"; }],
    ["absolute source paths", (value: any) => { value.brief.permitted_excerpts[0].citation.source = "/private/source.md"; }],
    ["source traversal", (value: any) => { value.brief.permitted_excerpts[0].citation.source = "s1/../private/source.md"; }],
    ["invented external facts", (value: any) => { value.brief.external_facts = [{ text: "unverified" }]; }],
    ["an unsupported tokenizer", (value: any) => { value.brief.status.tokenizer = "unknown"; }],
    ["inconsistent status", (value: any) => { value.status.corpusRevision++; }],
    ["missing citations", (value: any) => { delete value.brief.permitted_excerpts[0].citation; }],
    ["unlabeled conflicts", (value: any) => { value.brief.conflicts = [{ rule_ids: ["r1", "r2"] }]; value.brief.status.conflicts = 1; value.status.conflicts = 1; }],
    ["an empty mode with useful items", (value: any) => { value.brief.status.mode = "empty"; value.status.mode = "empty"; }],
    ["an empty synthesis", (value: any) => { value.brief.synthesis = { text: "", citations: [] }; }],
  ])("fails open for %s", async (_name, mutate) => {
    const value = await fixture();
    mutate(value);
    const result = await run(value);
    expect(result).toEqual({ stdout: "", stderr: "Othie Codex hook: invalid_context_response\n" });
    expect(result.stderr).not.toMatch(/PRIVATE|\/private|source\.md/);
  });

  it("rejects oversized input before using the engine", async () => {
    const query = vi.fn();
    const result = await runPromptHook("codex", event + " ".repeat(1_000_000), options, { query });
    expect(result.stderr).toContain("invalid_event");
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects invalid deadlines without querying", async () => {
    const query = vi.fn();
    expect((await runPromptHook("codex", event, { ...options, deadlineMs: 0 }, { query })).stderr).toContain("invalid_options");
    expect(query).not.toHaveBeenCalled();
  });

  it("aborts an uncooperative request and discards its late result", async () => {
    let signal: AbortSignal | undefined;
    let resolveLate!: (value: unknown) => void;
    const result = await runPromptHook("codex", event, { ...options, deadlineMs: 10 }, { query: async (_request, value) => {
      signal = value;
      return new Promise((resolveResult) => { resolveLate = resolveResult; });
    } });
    expect(signal?.aborted).toBe(true);
    expect(result).toEqual({ stdout: "", stderr: "Othie Codex hook: context_timeout\n" });
    resolveLate(await fixture());
  });

  it("discards a response when synchronous work delays the deadline callback", async () => {
    const value = await fixture();
    const result = await runPromptHook("codex", event, { ...options, deadlineMs: 5 }, { query: async () => {
      const until = performance.now() + 15;
      while (performance.now() < until) { /* Simulate synchronous provider work. */ }
      return value;
    } });
    expect(result).toEqual({ stdout: "", stderr: "Othie Codex hook: context_timeout\n" });
  });

  it("emits only allowlisted JSON diagnostics for useful context", async () => {
    const result = await run(await fixture(), { diagnosticsJson: true });
    const metadata = JSON.parse(result.stderr);
    expect(metadata).toEqual({ schema_version: "1", event: "othie_prompt_hook", host: "codex", surface: "code", phase: "turn_start", outcome: "injected", elapsed_ms: expect.any(Number), mode: "deterministic", token_count: expect.any(Number), omitted_items: 0, rule_count: 0, excerpt_count: 1, synthesis_count: 0, conflict_count: 0 });
    expect(result.stderr).not.toMatch(/PRIVATE|workspace|company|support|source|credential|session/);
    expect(result.stdout).toContain("Support replies");
  });

  it("makes empty results observable only when diagnostics are enabled", async () => {
    const value = await fixture("codex", "empty-result");
    expect(await run(value)).toEqual({ stdout: "", stderr: "" });
    const result = await run(value, { diagnosticsJson: true });
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({ outcome: "empty", mode: "empty", rule_count: 0, excerpt_count: 0 });
  });

  it("excludes unvalidated fields and errors from failure diagnostics", async () => {
    const result = await runPromptHook("claude-code", event, { ...options, diagnosticsJson: true }, { query: async () => { throw new Error("PRIVATE_PROMPT PRIVATE_SECRET"); } });
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toEqual({ schema_version: "1", event: "othie_prompt_hook", host: "claude-code", surface: "code", phase: "turn_start", outcome: "context_unavailable", elapsed_ms: expect.any(Number) });
    expect(result.stderr).not.toMatch(/PRIVATE|token_count|profile/);
  });
});
