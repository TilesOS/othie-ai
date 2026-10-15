import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hookLatencyOptionsSchema, runHookLatencyAcceptance, scoreHookLatencyAttempt } from "../src/evaluation/hook-latency.js";

const options = hookLatencyOptionsSchema.parse({});
const result = { code: 0, signal: null, stdout: "", wall_ms: 2_080, timed_out: false,
  output_limit_exceeded: false, start_failed: false,
  stderr: JSON.stringify({ schema_version: "1", event: "othie_prompt_hook", host: "codex", surface: "code", phase: "turn_start",
    outcome: "context_timeout", elapsed_ms: 2_001 }) };

describe("process-level hook latency acceptance", () => {
  it("separates the adapter timeout from the complete process and host budgets", () => {
    expect(scoreHookLatencyAttempt("codex", "stalled-engine", result, options, true)).toMatchObject({
      behavior_passed: true, latency_passed: true, process_budget_ms: 3_000, passed: true,
    });
    const empty = { ...result, stderr: result.stderr.replace("context_timeout", "empty") };
    expect(scoreHookLatencyAttempt("codex", "irrelevant", empty, options, true)).toMatchObject({
      behavior_passed: true, latency_passed: false, process_budget_ms: 2_000, passed: false,
    });
  });

  it("requires an actual engine stall, correct host diagnostics and quiet fail-open output", () => {
    expect(scoreHookLatencyAttempt("codex", "stalled-engine", result, options, false).passed).toBe(false);
    expect(scoreHookLatencyAttempt("claude-code", "stalled-engine", result, options, true).passed).toBe(false);
    expect(scoreHookLatencyAttempt("codex", "stalled-engine", { ...result, stdout: "late context" }, options, true).passed).toBe(false);
    expect(scoreHookLatencyAttempt("codex", "stalled-engine", { ...result, timed_out: true }, options, true).passed).toBe(false);
    expect(scoreHookLatencyAttempt("codex", "stalled-engine", { ...result, stderr: "{}" }, options, true).passed).toBe(false);
  });

  it("does not accept an injected answer that loses the source's deadline qualification", () => {
    const injected = { ...result, wall_ms: 100, stderr: result.stderr.replace("context_timeout", "injected").replace('"elapsed_ms":2001', '"elapsed_ms":100,"token_count":50'),
      stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: 'eleven hours source="s1/canary.md"' } }) };
    expect(scoreHookLatencyAttempt("codex", "positive", injected, options, true).passed).toBe(false);
    injected.stdout = injected.stdout.replace("eleven hours", "eleven hours; not a resolution deadline");
    expect(scoreHookLatencyAttempt("codex", "positive", injected, options, true).passed).toBe(true);
  });

  it("rejects incompatible budgets and invalid repeat counts before starting an engine", () => {
    for (const value of [{ repeats: 0 }, { repeats: 1.5 }, { deadline_ms: 0 }, { deadline_ms: 3_000 }, { host_timeout_ms: 2_000 }]) {
      expect(() => hookLatencyOptionsSchema.parse(value)).toThrow();
    }
  });

  it("runs both compiled adapters against fresh live state and preserves attempts without overwrites", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-hook-latency-test-")), out = join(root, "evidence");
    try {
      // This regression verifies behavior and evidence under parallel suite load.
      // Standalone acceptance retains its strict 2-second/3-second defaults.
      const report = await runHookLatencyAcceptance(out, { repeats: 1, deadline_ms: 5_000, host_timeout_ms: 8_000 });
      expect(report.completed).toBe(true);
      expect(report.attempts.filter((attempt) => !attempt.behavior_passed)).toEqual([]);
      expect(report.passed).toBe(report.attempts.every((attempt) => attempt.passed));
      expect(report.latency_passed).toBe(report.attempts.every((attempt) => attempt.latency_passed));
      expect(report.attempts).toHaveLength(14);
      expect(report.attempts.filter((attempt) => attempt.condition.includes("stalled-engine"))).toHaveLength(4);
      expect(report.attempts.filter((attempt) => attempt.condition.includes("stalled-engine")).every((attempt) => attempt.engine_received)).toBe(true);
      const files = await readdir(out);
      expect(files).toHaveLength(16);
      const evidence = await Promise.all(files.map((file) => readFile(join(out, file), "utf8")));
      expect(evidence.join("\n")).not.toMatch(/PRIVATE_|othie-hook-latency-[A-Za-z0-9]+|credentials\.json|\.credential/);
      const before = await readFile(join(out, "summary.json"), "utf8");
      await expect(runHookLatencyAcceptance(out, { repeats: 1 })).rejects.toThrow();
      expect(await readFile(join(out, "summary.json"), "utf8")).toBe(before);
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 60_000);
});
