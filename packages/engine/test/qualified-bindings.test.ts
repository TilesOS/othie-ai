import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { clauseBindingCases } from "../src/evaluation/clause-bindings-cases.js";
import { qualifiedBindingCases, qualifiedBindingCounterexamples } from "../src/evaluation/qualified-bindings-cases.js";
import { qualifiedBindingTerms } from "../src/evaluation/qualified-bindings.js";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";

it("retains all 74 prior cases and selects the qualification corpus explicitly", () => {
  expect(qualifiedBindingCases.slice(0, 74)).toEqual(clauseBindingCases);
  expect(qualifiedBindingCounterexamples).toHaveLength(16);
  expect(new Set(qualifiedBindingCases.map(({ id }) => id)).size).toBe(90);
  expect(queryScopeOptions(["--out", "x", "--corpus", "qualified-bindings"]).corpus).toBe("qualified-bindings");
  expect(queryScopeOptions(["--out", "x"]).corpus).toBe("original");
});

it("associates a trailing modifier with its immediate subject", () => {
  const terms = qualifiedBindingTerms("Sort solve(request), then sort solve(export), following company documents.");
  expect(terms).toContain("export");
  expect(terms).not.toContain("request");
  expect(qualifiedBindingTerms("Sort solve(request). Follow company documents for formatting.")).not.toContain("request");
  expect(qualifiedBindingTerms("Sort solve(request), without following company documents.")).not.toContain("request");
  expect(qualifiedBindingTerms("Sort solve(request), following the literal string 'company policy'.")).not.toContain("request");
});

it("distinguishes replacement intent, local negation and negated policy lookup", () => {
  expect(qualifiedBindingTerms("Do not merely sort solve(refund); implement eligibility.")).toContain("refund");
  expect(qualifiedBindingTerms("Never just sort solve(refund); implement eligibility.")).toContain("refund");
  expect(qualifiedBindingTerms("Do not merely sort solve(request); leave it alone.")).not.toContain("request");
  expect(qualifiedBindingTerms("Don't deduplicate refund(values); preserve the input.")).not.toContain("refund");
  expect(qualifiedBindingTerms("Sort solve(request) without consulting company policy.")).not.toContain("request");
  expect(qualifiedBindingTerms("Without consulting company policy, sort solve(request).")).not.toContain("request");
  const separate = qualifiedBindingTerms("Do not sort solve(request); implement solve(telemetry) according to company documents.");
  expect(separate).not.toContain("request");
  expect(separate).toContain("telemetry");
});

it("keeps malformed input and punctuation inside quoted or nested calls visible to the right scope", () => {
  expect(qualifiedBindingTerms("Sort solve(refund")).toContain("refund");
  expect(qualifiedBindingTerms("Sort refund(parse('request; then implement telemetry')).")).not.toContain("telemetry");
  expect(qualifiedBindingTerms("Implement company defaults for `refund`.")).toContain("refund");
});

it("verifies gains and retained failures through actual retrieval in both modes", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-qualified-test-"));
  try {
    const out = join(root, "evidence");
    const compiled = fileURLToPath(new URL("../dist/src/evaluation/query-scope.js", import.meta.url));
    await expect(promisify(execFile)(process.execPath, [compiled, "--out", out, "--repeats", "1", "--corpus", "qualified-bindings"], { timeout: 30_000 })).rejects.toMatchObject({ code: 1 });
    const summary = JSON.parse(await readFile(join(out, "summary.json"), "utf8"));
    expect(summary.completed).toBe(true);
    expect(summary.all_correct).toBe(false);
    expect(summary.rows).toBe(1260);
    expect(summary.scores.every((row: { citations_exact: boolean; caps_passed: boolean }) => row.citations_exact && row.caps_passed)).toBe(true);
    type Row = { id: string; mode: string; strategy: string; correct: boolean };
    const rows: Row[] = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
    type Score = { mode: string; strategy: string; positive: { correct: number; total: number }; no_op: { correct: number; total: number } };
    for (const mode of ["excerpts", "rules_only"]) {
      const row = (id: string, strategy = "qualified-bindings") => rows.find((item) => item.id === id && item.mode === mode && item.strategy === strategy)!;
      for (const id of ["clause-trailing-isolated", "clause-negated-only", "clause-negated-policy-same", "clause-adverb-negation"]) {
        expect(row(id).correct, id).toBe(true);
        expect(row(id, "clause-bindings").correct, id).toBe(false);
      }
      for (const id of ["qualified-trailing-required", "qualified-distant-antecedent", "qualified-local-followup"]) expect(row(id).correct, id).toBe(false);
      const score = (subset: Score[]) => subset.find((item) => item.mode === mode && item.strategy === "qualified-bindings")!;
      expect(score(summary.scores).positive).toEqual({ correct: 47, total: 49 });
      expect(score(summary.scores).no_op).toEqual({ correct: 34, total: 41 });
      expect(score(summary.subsets.original).positive).toEqual({ correct: 15, total: 15 });
      expect(score(summary.policy_guard).positive).toEqual({ correct: 9, total: 9 });
      expect(score(summary.local_bindings).positive).toEqual({ correct: 6, total: 6 });
      expect(score(summary.clause_bindings).positive).toEqual({ correct: 11, total: 11 });
      expect(score(summary.qualified_bindings).positive).toEqual({ correct: 6, total: 8 });
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}, 35_000);
