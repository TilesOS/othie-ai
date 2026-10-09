import { expect, it } from "vitest";
import { selectQualityCandidates } from "../src/evaluation/quality-candidates.js";
import { candidateCoverage, diagnosticScores } from "../src/evaluation/quality-metrics.js";
import { qualityOptionsSchema } from "../src/evaluation/model-quality.js";
import type { RuleRecord } from "../src/types.js";

const rule = (id: string, text: string, extra: Partial<RuleRecord> = {}): RuleRecord => ({
  id, text, quotation: text, profile: "company", documentId: "support", revisionId: "current", sourcePath: "/policies/support.md",
  location: "lines 1-1", authorityPriority: 80, global: false, category: "generated", applicability: "generated",
  modelIdentity: "test", promptVersion: "test", ...extra,
});
const seed = rule("s1", "Support agents must acknowledge priority tickets within thirty minutes.");
const linked = rule("s2", "Priority tickets unresolved after four hours must be escalated to the on-call lead.", { location: "lines 2-2" });
const scenario = { id: "support", query: "support", sources: ["support.md"], patterns: ["thirty minutes", "four hours", "on-call lead"] };

it("recovers original linked requirements for a short subject query without matching generated labels", () => {
  const labelOnly = rule("label", "Employees must retain receipts.", { documentId: "receipts", sourcePath: "/policies/receipts.md", category: "support" });
  const rules = [linked, labelOnly, seed];
  expect(selectQualityCandidates(rules, scenario.query, "lexical")).toEqual([seed]);
  const expanded = selectQualityCandidates(rules, scenario.query, "source-revision");
  expect(expanded).toEqual([seed, linked]);
  expect(expanded[1]).toBe(linked);
  expect(candidateCoverage(scenario, [seed]).missing_qualifier_patterns).toEqual(["four hours", "on-call lead"]);
  expect(candidateCoverage(scenario, expanded).complete).toBe(true);
});

it("never crosses profile, document, revision, source or authority boundaries during expansion", () => {
  const foreign = [
    { profile: "other" }, { documentId: "another" }, { revisionId: "old" },
    { sourcePath: "/policies/other.md" }, { authorityPriority: 20 },
  ].map((extra, i) => rule(`foreign-${i}`, linked.text, extra));
  expect(selectQualityCandidates([seed, ...foreign], "support", "source-revision")).toEqual([seed]);
  expect(selectQualityCandidates([seed, linked], "refactor sorting comparator", "source-revision")).toEqual([]);
  expect(selectQualityCandidates([{ ...seed, global: true }, linked], "refactor sorting comparator", "source-revision")).toEqual([{ ...seed, global: true }]);
});

it("adds each sibling once in stable order and exposes unrelated evidence overfetch as a limitation", () => {
  const unrelated = rule("s3", "Employees must retain receipts.", { location: "lines 3-3" });
  const secondHit = rule("s4", "Support agents must wear badges.", { location: "lines 4-4" });
  const a = selectQualityCandidates([unrelated, secondHit, linked, seed], "support", "source-revision");
  const b = selectQualityCandidates([seed, linked, secondHit, unrelated], "support", "source-revision");
  expect(a).toEqual(b);
  expect(new Set(a).size).toBe(4);
  expect(a).toContain(unrelated);
  expect(candidateCoverage({ ...scenario, sources: [], patterns: [] }, a).complete).toBe(false);
});

it("reports positive recall and no-op precision separately so a combined gain cannot hide losses", () => {
  expect(diagnosticScores([
    { expected_sources: ["support.md"], correct: false }, { expected_sources: ["support.md"], correct: true },
    { expected_sources: [], correct: true },
  ])).toEqual({ positive: { correct: 1, total: 2 }, no_op: { correct: 1, total: 1 }, combined: { correct: 2, total: 3 } });
  expect(qualityOptionsSchema.parse({}).hook_deadline_ms).toBe(2000);
  for (const value of [0, -1, 20_001, 1.5, NaN]) expect(() => qualityOptionsSchema.parse({ hook_deadline_ms: value })).toThrow();
});
