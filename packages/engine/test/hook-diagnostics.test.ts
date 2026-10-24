import { describe, expect, it } from "vitest";
import { defaultHookDelivery } from "../src/evaluation/hook-default-latency.js";
import { parseHookDiagnostic } from "../src/evaluation/hook-diagnostics.js";

const diagnostic = { schema_version: "1", event: "othie_prompt_hook", host: "codex", surface: "code", phase: "turn_start",
  outcome: "injected", elapsed_ms: 100, mode: "fallback", token_count: 100, omitted_items: 0, rule_count: 0, excerpt_count: 1, synthesis_count: 0, conflict_count: 0 };
const stdout = JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext:
  '<excerpt source="s1/canary.md">Canary support policy requires the first response within eleven hours. This is a first-response target, not a resolution deadline.</excerpt>' } });

describe("content-free hook acceptance diagnostics", () => {
  it("accepts the runtime event and rejects private additions, malformed fields and extra output", () => {
    expect(parseHookDiagnostic(JSON.stringify(diagnostic) + "\n")).toEqual(diagnostic);
    for (const change of [
      { prompt: "PRIVATE_PROMPT" }, { credential: "PRIVATE_SECRET" }, { profile: "PRIVATE_PROFILE" },
      { elapsed_ms: "PRIVATE_PATH" }, { mode: "PRIVATE_PROFILE" }, { token_count: 501 }, { elapsed_ms: -1 },
      { elapsed_ms: 0.5 }, { event: "other" }, { phase: "other" }, { schema_version: "2" },
    ]) expect(parseHookDiagnostic(JSON.stringify({ ...diagnostic, ...change }))).toBeNull();
    for (const text of ["null", "[]", "{}", "not JSON", JSON.stringify(diagnostic) + "\nPRIVATE_SECRET", JSON.stringify([diagnostic])]) {
      expect(parseHookDiagnostic(text)).toBeNull();
    }
  });

  it("requires allowlisted diagnostics and the complete cited hook event in the default evaluator", () => {
    for (const host of ["codex", "claude-code"] as const) for (const condition of ["positive", "irrelevant", "revoked", "unavailable"] as const) {
      const event = { ...diagnostic, host, outcome: condition === "positive" ? "injected" : condition === "irrelevant" ? "empty" : "context_unavailable" };
      const output = condition === "positive" ? stdout : "";
      expect(defaultHookDelivery(host, condition, output, JSON.stringify(event))).toBe(true);
      for (const change of [{ prompt: "PRIVATE_PROMPT" }, { elapsed_ms: "PRIVATE_PATH" }, { token_count: 501 }]) {
        expect(defaultHookDelivery(host, condition, output, JSON.stringify({ ...event, ...change }))).toBe(false);
      }
      expect(defaultHookDelivery(host, condition, output, JSON.stringify({ ...event, host: "other" }))).toBe(false);
      if (condition !== "positive") expect(defaultHookDelivery(host, condition, " ", JSON.stringify(event))).toBe(false);
    }
    for (const output of [stdout.replace("UserPromptSubmit", "SessionStart"), stdout.replace("not a resolution deadline", "a resolution deadline"), stdout.replace("s1/canary.md", "other.md"), "{}"])
      expect(defaultHookDelivery("codex", "positive", output, JSON.stringify(diagnostic))).toBe(false);
    const { token_count, ...missingCount } = diagnostic;
    expect(defaultHookDelivery("codex", "positive", stdout, JSON.stringify(missingCount))).toBe(false);
  });
});
