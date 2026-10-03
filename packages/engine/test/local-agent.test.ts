import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentCases } from "../src/evaluation/agent-cases.js";
import { gradeCode } from "../src/evaluation/agent-grader.js";
import { executeAgentAction, runAgentTrajectory, type AgentModel } from "../src/evaluation/local-agent.js";

const control = agentCases.find((scenario) => scenario.control)!;
const correct = "function solve(numbers) { return [...new Set(numbers)].sort((a, b) => a - b); }";
function replies(actions: unknown[]): AgentModel {
  return async () => ({ content: JSON.stringify(actions.shift()), input_tokens: 10, output_tokens: 5 });
}

describe("local tool-using agent evaluation", () => {
  it("scores hidden behavior and input preservation rather than a model's success claim", async () => {
    expect((await gradeCode(correct, control.hiddenProbes)).passed).toBe(3);
    expect((await gradeCode("function solve(numbers) { return numbers.sort((a,b) => a-b); }", control.hiddenProbes)).passed).toBeLessThan(3);
    expect((await gradeCode("function solve() { return [1,2]; }", control.hiddenProbes)).passed).toBe(0);
    expect((await gradeCode("function solve() { while(true) {} }", control.hiddenProbes)).passed).toBe(0);
    expect((await gradeCode("function solve() { return process.env; }", control.hiddenProbes)).passed).toBe(0);
  });

  it("runs read/edit/test tools, retains transcripts, and keeps paired workspaces fresh", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-agent-harness-"));
    try {
      const first = await runAgentTrajectory({ workspace: join(root, "first"), scenario: control, seed: 1, maxTurns: 5,
        model: replies([
          { action: "read_file", path: "solution.js", content: "" },
          { action: "write_file", path: "solution.js", content: correct },
          { action: "run_tests", path: "", content: "" },
          { action: "finish", path: "", content: "done" },
        ]) });
      expect(first.correct).toBe(true); expect(first.ran_public_tests).toBe(true);
      expect(first.tool_calls).toBe(3); expect(first.input_tokens).toBe(40);
      expect(first.turns[0]!.tool_result).toBe(control.initial);
      expect(first.initial_messages).toHaveLength(2);
      expect(JSON.stringify(first.initial_messages)).not.toContain("hiddenProbes");
      const second = await runAgentTrajectory({ workspace: join(root, "second"), scenario: control, seed: 1, maxTurns: 2,
        model: replies([{ action: "finish", path: "", content: "all tests pass" }]) });
      expect(second.correct).toBe(false); expect(second.final_code).toBe(control.initial);
      expect(await readFile(join(root, "first", "solution.js"), "utf8")).toBe(correct);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("denies traversal, hidden probes, and writes to the readme", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-agent-allowlist-"));
    try {
      for (const path of ["../protocol.json", "/etc/passwd", "README.md", "hidden-tests.js"]) {
        expect(await executeAgentAction(root, control, { action: "write_file", path, content: "tampered" })).toBe("error: file is not available");
      }
      expect(await executeAgentAction(root, control, { action: "read_file", path: "../protocol.json", content: "" })).toBe("error: file is not available");
      await expect(executeAgentAction(root, control, { action: "shell", path: "", content: "pwd" })).rejects.toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("records invalid actions, model failures, and unfinished runs as failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-agent-failure-"));
    try {
      const limited = await runAgentTrajectory({ workspace: join(root, "limit"), scenario: control, seed: 1, maxTurns: 1,
        model: replies([{ action: "write_file", path: "solution.js", content: correct }]) });
      expect(limited.grade.passed).toBe(3); expect(limited.correct).toBe(false); expect(limited.completion).toBe("turn_limit");
      const invalid = await runAgentTrajectory({ workspace: join(root, "invalid"), scenario: control, seed: 1, maxTurns: 1, model: replies([{ action: "shell" }]) });
      expect(invalid.turns[0]!.error).toBe("invalid_action"); expect(invalid.tool_calls).toBe(0);
      const failed = await runAgentTrajectory({ workspace: join(root, "failure"), scenario: control, seed: 1, maxTurns: 1,
        model: async () => { throw new Error("private provider error"); } });
      expect(failed.completion).toBe("model_error"); expect(failed.input_tokens).toBeNull();
      expect(JSON.stringify(failed)).not.toContain("private provider error");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
