import { expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { clauseBindingCases, clauseBindingCounterexamples } from "../src/evaluation/clause-bindings-cases.js";
import { localBindingCases } from "../src/evaluation/local-bindings-cases.js";
import { clauseBindingTerms } from "../src/evaluation/clause-bindings.js";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";

it("keeps all 57 prior cases and requires explicit clause-corpus selection", () => {
  expect(clauseBindingCases.slice(0, 57)).toEqual(localBindingCases);
  expect(clauseBindingCounterexamples).toHaveLength(17);
  expect(new Set(clauseBindingCases.map(({ id }) => id)).size).toBe(74);
  expect(queryScopeOptions(["--out", "x", "--corpus", "clause-bindings"]).corpus).toBe("clause-bindings");
  expect(queryScopeOptions(["--out", "x"]).corpus).toBe("original");
});

it("separates local calls from active subjects within mixed instructions", () => {
  for (const id of ["mixed-same-sentence-refund", "policy-numeric-refund", "negated-local-refund", "clause-nested-mixed", "clause-conjoined-mixed", "clause-reversed-mixed", "clause-apostrophe"]) {
    const query = clauseBindingCases.find((row) => row.id === id)!.query;
    expect(clauseBindingTerms(query), id).toContain("refund");
  }
  for (const id of ["local-function-name", "local-quoted-identifier", "clause-quoted-local-call", "clause-nested-quoted-argument", "clause-literal-punctuation"]) {
    const query = clauseBindingCases.find((row) => row.id === id)!.query;
    expect(clauseBindingTerms(query), id).not.toContain("refund");
    expect(clauseBindingTerms(query), id).not.toContain("request");
  }
});

it("retains malformed code and policy-bearing sorting, exposing trailing and negation limits", () => {
  expect(clauseBindingTerms("Sort solve(refund")).toContain("refund");
  expect(clauseBindingTerms("Sort solve(export) according to company documents.")).toContain("export");
  expect(clauseBindingTerms("Sort solve(export), following company documents.")).not.toContain("export");
  expect(clauseBindingTerms("Do not sort solve(request).")).toContain("request");
  expect(clauseBindingTerms("Sort solve(request) without consulting company policy.")).toContain("request");
  expect(clauseBindingTerms("Do not merely sort solve(refund); implement eligibility.")).not.toContain("refund");
  expect(clauseBindingTerms("Do not consult company policy; sort solve(request).")).not.toContain("request");
});

it("does not create operation boundaries inside identifiers or quoted code", () => {
  expect(clauseBindingTerms("Sort command implement solve(request).")).not.toContain("request");
  expect(clauseBindingTerms("Sort refund(parse('request; then implement telemetry')).")).not.toContain("telemetry");
  expect(clauseBindingTerms("Implement company defaults for `refund` with numeric limits.")).toContain("refund");
});

it("pairs real retrieval with prior candidates and preserves all four diagnostic subsets", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-clauses-test-"));
  try {
    const out = join(root, "evidence");
    const compiled = fileURLToPath(new URL("../dist/src/evaluation/query-scope.js", import.meta.url));
    await expect(promisify(execFile)(process.execPath, [compiled, "--out", out, "--repeats", "1", "--corpus", "clause-bindings"], { timeout: 30_000 })).rejects.toMatchObject({ code: 1 });
    const summary = JSON.parse(await readFile(join(out, "summary.json"), "utf8"));
    expect(summary.completed).toBe(true);
    expect(summary.all_correct).toBe(false);
    expect(summary.rows).toBe(888);
    expect(summary.scores.every((row: { citations_exact: boolean; caps_passed: boolean }) => row.citations_exact && row.caps_passed)).toBe(true);
    const rows = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
    for (const mode of ["excerpts", "rules_only"]) {
      const row = (id: string, strategy = "clause-bindings") => rows.find((item: { id: string; strategy: string; mode: string }) => item.id === id && item.strategy === strategy && item.mode === mode);
      for (const id of ["implicit-refund", "mixed-same-sentence-refund", "policy-numeric-refund", "negated-local-refund", "local-function-name", "local-quoted-identifier", "clause-nested-mixed", "clause-conjoined-mixed", "clause-reversed-mixed", "clause-company-sort", "clause-apostrophe"]) expect(row(id).correct, id).toBe(true);
      expect(row("mixed-same-sentence-refund", "local-bindings").correct).toBe(false);
      // Customer-record vocabulary independently recovers the export source;
      // the paired isolated subject exposes the actual trailing-clause loss.
      expect(row("clause-trailing-company").correct).toBe(true);
      for (const id of ["clause-trailing-isolated", "clause-negated-only", "clause-negated-policy-same", "clause-adverb-negation"]) expect(row(id).correct, id).toBe(false);
      const score = (subset: Array<{ strategy: string; mode: string; positive: { correct: number; total: number } }>) => subset.find((item) => item.strategy === "clause-bindings" && item.mode === mode)!.positive;
      expect(score(summary.subsets.original)).toEqual({ correct: 15, total: 15 });
      expect(score(summary.policy_guard)).toEqual({ correct: 9, total: 9 });
      expect(score(summary.local_bindings)).toEqual({ correct: 6, total: 6 });
      expect(score(summary.clause_bindings).correct).toBeLessThan(score(summary.clause_bindings).total);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}, 35_000);
