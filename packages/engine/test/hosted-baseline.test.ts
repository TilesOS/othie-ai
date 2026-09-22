import { describe, expect, it } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { cases, parsedAnswer, policies, scoreAnswer } from "../src/evaluation/hosted-baseline.js";
import { OthieEngine } from "../src/engine/service.js";
import { selectRules } from "../src/rules/selection.js";
import type { RuleRecord } from "../src/types.js";
import { fixture, waitFor } from "./helpers.js";

describe("hosted baseline scoring", () => {
  it("keeps expected answers explicit across the policy and control families", () => {
    expect(cases.map((scenario) => scenario.id)).toEqual([
      "support-weekend-exception", "acme-refund-exception", "eu-telemetry-default", "repository-only-control",
    ]);
    expect(cases.filter((scenario) => scenario.family === "repository-only-control")).toHaveLength(1);
  });

  it("scores only exact requested values after harmless formatting normalization", () => {
    expect(scoreAnswer("  DISABLED. ", "disabled")).toBe(true);
    expect(scoreAnswer("12 hours", "12")).toBe(false);
    expect(scoreAnswer("unknown", "7")).toBe(false);
    expect(parsedAnswer('{"answer":"7"}', { input_tokens: 10 }).answer).toBe("7");
    expect(parsedAnswer('{"answer":', { output_tokens: 512 }).error).toBe("invalid_answer");
    expect(parsedAnswer(" 6 \n", { output_tokens: 1 }, undefined, "plain").answer).toBe("6");
  });

  it("does not select a policy rule on generic coding-prompt words", () => {
    const rule: RuleRecord = { id: "r1", profile: "company", documentId: "d1", revisionId: "v1", sourcePath: "/synthetic/refunds.md", text: "Acme annual-plan refunds are allowed only within seven days.", category: "refund", applicability: "Acme annual plans", quotation: "within seven days", location: "paragraph 1", authorityPriority: 80, global: false, modelIdentity: "openai:test:v1", promptVersion: "rules-v1" };
    expect(selectRules([rule], cases[3]!.task, [])).toEqual([]);
    expect(selectRules([rule], cases[0]!.task, [])).toEqual([]);
    expect(selectRules([rule], cases[1]!.task, [])).toHaveLength(1);
  });

  it("retrieves synthetic policy evidence and stays empty for a repository-only task", async () => {
    const f = await fixture();
    f.config.profiles.company!.providers.embeddings = [];
    f.config.profiles.company!.providers.extraction = [];
    for (const policy of policies) await writeFile(join(f.docs, policy.name), policy.text);
    const engine = new OthieEngine(f.config, f.data);
    try {
      await engine.start();
      await waitFor(() => engine.store.listActiveChunks("company").length === policies.length);
      const policy = await engine.context("company", { query: cases[0]!.task, surface: "code", phase: "turn_start" });
      expect(policy.brief.permitted_excerpts.some((excerpt) => excerpt.citation.source === "s1/support.md")).toBe(true);
      const control = await engine.context("company", { query: cases[3]!.task, surface: "code", phase: "turn_start" });
      expect(control.status.mode).toBe("empty");
    } finally {
      await engine.stop();
      await rm(f.root, { recursive: true, force: true });
    }
  });
});
