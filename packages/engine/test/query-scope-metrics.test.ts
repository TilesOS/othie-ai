import { expect, it } from "vitest";
import { queryScopeCases, queryScopeDocuments } from "../src/evaluation/query-scope-cases.js";
import { scoreQueryScope } from "../src/evaluation/query-scope.js";
import { queryScopeScores } from "../src/evaluation/query-scope-metrics.js";

const scenario = queryScopeCases.find((item) => item.id === "refund-prose")!;
const quote = (source: string) => ({ source: `s1/${source}`, quote: queryScopeDocuments.find((item) => item.name === source)!.text });
const metric = (evidence: ReturnType<typeof quote>[], sources = scenario.sources) => ({
  ...scoreQueryScope({ ...scenario, sources }, evidence), expected_sources: sources, citations_exact: true, cap_passed: true,
});

it("preserves recall while rejecting extra evidence on positive tasks", () => {
  const row = metric([quote("refunds.md"), quote("support.md")]);
  expect(row.correct).toBe(true);
  expect(row.precise_correct).toBe(false);
  const scores = queryScopeScores([row]);
  expect(scores.positive).toEqual({ correct: 1, total: 1 });
  expect(scores.positive_exact).toEqual({ correct: 0, total: 1 });
  expect(scores.positive_with_additional_sources).toEqual({ count: 1, total: 1 });
  expect(scores.gates).toMatchObject({ positive_recall: true, positive_exact: false, accepted: false });
});

it("counts source memberships once per task and requires every opposing source", () => {
  const complete = metric([quote("refunds.md"), quote("refunds.md"), quote("support.md")]);
  const partial = metric([quote("current-export.md")], ["current-export.md", "legacy-export.md"]);
  const opposition = metric([quote("current-export.md"), quote("legacy-export.md")], ["current-export.md", "legacy-export.md"]);
  expect(opposition.precise_correct).toBe(true);
  expect(partial.precise_correct).toBe(false);
  const scores = queryScopeScores([complete, partial, opposition]);
  expect(scores.positive_source_precision).toEqual({ relevant: 4, retrieved: 5 });
  expect(scores.positive_exact).toEqual({ correct: 1, total: 3 });
});

it("cannot pass by suppressing retrieval or returning incomplete expected evidence", () => {
  const empty = metric([]);
  const truncated = metric([{ source: "s1/refunds.md", quote: "thirty days" }]);
  expect(empty.precise_correct).toBe(false);
  expect(truncated.precise_correct).toBe(false);
  const scores = queryScopeScores([empty, truncated]);
  expect(scores.positive_source_precision).toEqual({ relevant: 1, retrieved: 1 });
  expect(scores.positive_with_additional_sources).toEqual({ count: 0, total: 2 });
  expect(scores.gates).toMatchObject({ positive_recall: false, positive_exact: false, accepted: false });
  expect(queryScopeScores([empty]).positive_source_precision).toEqual({ relevant: 0, retrieved: 0 });
});

it("keeps no-ops separate and rejects citation or token failures and empty subsets", () => {
  const positive = metric([quote("refunds.md")]);
  const silent = metric([], []);
  expect(silent.precise_correct).toBe(true);
  expect(queryScopeScores([positive, silent]).gates.accepted).toBe(true);
  const noisy = metric([quote("refunds.md")], []);
  const scores = queryScopeScores([positive, silent, noisy]);
  expect(scores.positive_exact).toEqual({ correct: 1, total: 1 });
  expect(scores.no_op).toEqual({ correct: 1, total: 2 });
  expect(scores.positive_source_precision).toEqual({ relevant: 1, retrieved: 1 });
  expect(scores.gates.accepted).toBe(false);
  for (const failure of [{ citations_exact: false }, { cap_passed: false }]) {
    expect(queryScopeScores([{ ...positive, ...failure, correct: false, precise_correct: false }]).gates.accepted).toBe(false);
  }
  expect(queryScopeScores([]).gates.accepted).toBe(false);
});
