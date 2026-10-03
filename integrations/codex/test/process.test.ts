import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

const event = JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd: "/workspace", prompt: "PRIVATE_PROMPT", transcript_path: "PRIVATE_TRANSCRIPT" });
function invoke(input: string | undefined, extraArgs: string[] = []) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, ["dist/src/user-prompt-submit.js", "--deadline-ms", "100", ...extraArgs], { stdio: "pipe" });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("hook process did not exit")); }, 3000);
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.stdin.on("error", () => {});
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); resolveResult({ code, stdout, stderr }); });
    if (input !== undefined) child.stdin.end(input);
    // Leave stdin open for the deadline test.
  });
}

describe("compiled Codex hook process", () => {
  it("fails open when stdin never closes", async () => {
    expect(await invoke(undefined)).toEqual({ code: 0, stdout: "", stderr: "Othie Codex hook: context_timeout\n" });
  });
  it("rejects oversized multibyte input and exits without context", async () => {
    const raw = JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd: "/workspace", prompt: "界".repeat(400_000) });
    expect(await invoke(raw)).toEqual({ code: 0, stdout: "", stderr: "Othie Codex hook: invalid_event\n" });
  });
  it("does not expose subprocess errors when the CLI is missing", async () => {
    const result = await invoke(event, ["--cli", "/PRIVATE_MISSING_CLI"]);
    expect(result).toEqual({ code: 0, stdout: "", stderr: "Othie Codex hook: context_unavailable\n" });
  });
});
