import { expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { policyGuardCases } from "../src/evaluation/policy-guard-cases.js";
import { localBindingCases, localBindingCounterexamples } from "../src/evaluation/local-bindings-cases.js";
import { queryScopeOptions, queryScopeTerms } from "../src/evaluation/query-scope.js";

it("retains both existing corpora and selects the binding extension explicitly", () => {
  expect(localBindingCases.slice(0, 45)).toEqual(policyGuardCases);
  expect(localBindingCounterexamples).toHaveLength(12);
  expect(new Set(localBindingCases.map(({ id }) => id)).size).toBe(57);
  expect(queryScopeOptions(["--out", "x", "--corpus", "local-bindings"]).corpus).toBe("local-bindings");
  expect(queryScopeOptions(["--out", "x"]).corpus).toBe("original");
});

it("preserves implicit and active quoted subjects while exposing sentence and binding limitations", () => {
  const terms = (id: string) => queryScopeTerms(localBindingCases.find((row) => row.id === id)!.query, "local-bindings");
  expect(terms("implicit-refund")).toContain("refund");
  expect(terms("policy-without-magic-word")).toContain("refund");
  expect(terms("quoted-policy-subject")).toContain("telemetry");
  expect(terms("mixed-separated-refund")).toContain("refund");
  expect(terms("mixed-same-sentence-refund")).not.toContain("refund");
  expect(terms("local-quoted-identifier")).toContain("request");
});

it("measures real retrieval recall and no-ops separately, retaining rejected candidate cases", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-bindings-test-"));
  try {
    const out = join(root, "evidence");
    const compiled = fileURLToPath(new URL("../dist/src/evaluation/query-scope.js", import.meta.url));
    await expect(promisify(execFile)(process.execPath, [compiled, "--out", out, "--repeats", "1", "--corpus", "local-bindings"], { timeout: 30_000 })).rejects.toMatchObject({ code: 1 });
    const summary = JSON.parse(await readFile(join(out, "summary.json"), "utf8"));
    expect(summary.completed).toBe(true);
    expect(summary.all_correct).toBe(false);
    expect(summary.rows).toBe(570);
    expect(summary.scores.every((row: { citations_exact: boolean; caps_passed: boolean }) => row.citations_exact && row.caps_passed)).toBe(true);
    const rows = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
    for (const mode of ["excerpts", "rules_only"]) {
      const row = (id: string) => rows.find((item: { id: string; strategy: string; mode: string }) => item.id === id && item.strategy === "local-bindings" && item.mode === mode);
      expect(row("implicit-refund").correct).toBe(true);
      expect(row("native-array-service-control").correct).toBe(true);
      expect(row("mixed-separated-refund").correct).toBe(true);
      expect(row("mixed-same-sentence-refund").correct).toBe(false);
      expect(row("policy-numeric-refund").correct).toBe(false);
      expect(row("local-function-name").correct).toBe(false);
      expect(summary.policy_guard.find((item: { strategy: string; mode: string }) => item.strategy === "local-bindings" && item.mode === mode).positive).toEqual({ correct: 9, total: 9 });
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}, 35_000);
