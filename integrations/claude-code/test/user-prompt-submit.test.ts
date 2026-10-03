import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { runHook, type ContextQuery, type HookOptions } from "../src/user-prompt-submit.js";

const options: HookOptions = { cliPath: "/unused", configPath: "/unused", bridgeId: "claude-code", credentialFile: "/unused", maxTokens: 500, deadlineMs: 50 };
const event = JSON.stringify({ session_id: "PRIVATE_SESSION", transcript_path: "PRIVATE_TRANSCRIPT", cwd: "/workspace", hook_event_name: "UserPromptSubmit", permission_mode: "default", prompt: "PRIVATE_PROMPT" });
async function fixture(name: string): Promise<any> {
  const value = JSON.parse(await readFile(new URL(`../../codex/test/fixtures/${name}.json`, import.meta.url), "utf8"));
  if (value.brief?.request) value.brief.request.host = "claude-code";
  return value;
}

describe("Claude Code UserPromptSubmit adapter", () => {
  it("injects the same cited brief with Claude Code metadata", async () => {
    const query = vi.fn(async (_request: ContextQuery, _signal: AbortSignal) => fixture("relevant-result"));
    const result = await runHook(event, options, { query });
    expect(query.mock.calls[0]?.[0]).toEqual({ query: "PRIVATE_PROMPT", workspaceRoot: "/workspace", surface: "code", phase: "turn_start", host: "claude-code", maxTokens: 500 });
    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.additionalContext).toContain('source="s1/support.md"');
    expect(output.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(output.decision).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.stdout).not.toMatch(/PRIVATE_SESSION|PRIVATE_TRANSCRIPT|PRIVATE_PROMPT/);
  });
  it("stays silent for empty retrieval", async () => {
    expect(await runHook(event, options, { query: async () => fixture("empty-result") })).toEqual({ stdout: "", stderr: "" });
  });
  it("rejects invalid responses without leaking them", async () => {
    expect(await runHook(event, options, { query: async () => fixture("invalid-result") })).toEqual({ stdout: "", stderr: "Othie Claude Code hook: invalid_context_response\n" });
  });
  it("allows the prompt when the engine fails", async () => {
    expect(await runHook(event, options, { query: async () => { throw new Error("PRIVATE_SECRET"); } })).toEqual({ stdout: "", stderr: "Othie Claude Code hook: context_unavailable\n" });
  });
  it("aborts slow requests without a block decision", async () => {
    expect(await runHook(event, { ...options, deadlineMs: 10 }, { query: async () => new Promise(() => {}) })).toEqual({ stdout: "", stderr: "Othie Claude Code hook: context_timeout\n" });
  });
  it("ignores unrelated events before querying", async () => {
    const query = vi.fn();
    expect((await runHook('{"hook_event_name":"Stop"}', options, { query })).stdout).toBe("");
    expect(query).not.toHaveBeenCalled();
  });
  it("ships a synchronous exec-form setup with an outer timeout", async () => {
    const settings = JSON.parse(await readFile(new URL("../settings.example.json", import.meta.url), "utf8"));
    const handler = settings.hooks.UserPromptSubmit[0].hooks[0];
    expect(handler.type).toBe("command");
    expect(handler.command).toBe("/absolute/path/to/node");
    expect(handler.args).toContain("${CLAUDE_PROJECT_DIR}/integrations/claude-code/dist/src/user-prompt-submit.js");
    expect(handler.timeout).toBeGreaterThan(Number(handler.args[handler.args.indexOf("--deadline-ms") + 1]) / 1000);
    expect(handler.async).toBeUndefined();
  });
});
