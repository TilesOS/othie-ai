import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { recordingWrapper } from "../src/evaluation/native-hooks.js";

describe("native hook acceptance recorder", () => {
  it("forwards the host event and adapter output while excluding private event values from evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-native-recorder-"));
    const nested = join(root, "fixture with spaces"); await mkdir(nested);
    const adapter = join(nested, "adapter.mjs"), wrapper = join(nested, "wrapper.mjs"), receipt = join(nested, "receipt.json");
    try {
      await writeFile(adapter, `let text = ''; for await (const chunk of process.stdin) text += chunk;
        const event = JSON.parse(text);
        process.stdout.write(JSON.stringify({prompt_received: event.prompt === 'synthetic prompt'}));
        process.stderr.write(JSON.stringify({outcome: 'injected'}));`);
      await writeFile(wrapper, recordingWrapper([adapter], receipt));
      const output = await new Promise<{ stdout: string; stderr: string; code: number | null }>((done, reject) => {
        const child = spawn(process.execPath, [wrapper], { stdio: "pipe" });
        let stdout = "", stderr = "";
        child.stdout.setEncoding("utf8").on("data", (chunk) => stdout += chunk);
        child.stderr.setEncoding("utf8").on("data", (chunk) => stderr += chunk);
        child.once("error", reject); child.once("close", (code) => done({ stdout, stderr, code }));
        child.stdin.end(JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "synthetic prompt", model: "synthetic-model", session_id: "PRIVATE_SESSION", transcript_path: "PRIVATE_TRANSCRIPT", cwd: "PRIVATE_CWD" }));
      });
      const saved = await readFile(receipt, "utf8");
      expect(saved).not.toMatch(/PRIVATE_|synthetic prompt/);
      expect(JSON.parse(saved)).toMatchObject({ event: "UserPromptSubmit", model: "synthetic-model", code: 0, input_fields: ["cwd", "hook_event_name", "model", "prompt", "session_id", "transcript_path"] });
      expect(JSON.parse(output.stdout)).toEqual({ prompt_received: true });
      expect(JSON.parse(output.stderr)).toEqual({ outcome: "injected" }); expect(output.code).toBe(0);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
