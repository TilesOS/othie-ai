import { expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { nativeAgentProjectCases } from "../src/evaluation/native-agent-projects.js";
import { queryScopeCases, queryScopeDocuments } from "../src/evaluation/query-scope-cases.js";
import { policyGuardCases } from "../src/evaluation/policy-guard-cases.js";
import { queryScopeOptions, queryScopeTerms, scoreQueryScope } from "../src/evaluation/query-scope.js";
import { meaningfulTerms } from "../src/retrieval/terms.js";

it("retains the original native tasks and scopes interventions to the evaluator", () => {
  for (const scenario of nativeAgentProjectCases) expect(queryScopeCases.find((item) => item.id === `native-${scenario.id}`)?.query).toBe(scenario.task);
  const query = "Route solve(request, options). Need telemetry consent and refund request evidence.";
  expect(queryScopeTerms(query, "lexical")).toEqual(meaningfulTerms(query));
  expect(queryScopeTerms(query, "mask-call-arguments")).not.toContain("options");
  expect(queryScopeTerms(query, "mask-call-arguments")).toContain("request");
  expect(queryScopeTerms("Route solve(request).", "mask-call-arguments")).not.toContain("request");
  expect(queryScopeTerms("refund(request)", "mask-call-arguments")).toEqual(["refund"]);
  expect(queryScopeTerms("`telemetry` consent", "mask-call-arguments")).toEqual(["telemetry", "consent"]);
  expect(queryScopeTerms("request requests telemetry", "drop-request")).toEqual(["requests", "telemetry"]);
  expect(queryScopeTerms(queryScopeCases.find((item) => item.id === "late-policy-subject")!.query, "mask-call-arguments")).toContain("telemetry");
});

it("distinguishes lexical no-op gains from policy subjects lost inside signatures", () => {
  const control = queryScopeCases.find((item) => item.id === "native-array-service-control")!;
  const positive = queryScopeCases.find((item) => item.id === "telemetry-code-argument")!;
  expect(queryScopeTerms(control.query, "mask-call-arguments")).not.toContain("request");
  expect(queryScopeTerms(positive.query, "mask-call-arguments")).not.toContain("telemetry");
  expect(meaningfulTerms(positive.query)).toContain("telemetry");
});

it("requires full original sentences and both opposition sources while exposing extra retrieval", () => {
  const scenario = queryScopeCases.find((item) => item.id === "refund-prose")!;
  const refund = queryScopeDocuments.find((item) => item.name === "refunds.md")!;
  expect(scoreQueryScope(scenario, [{ source: "s1/refunds.md", quote: "thirty days" }]).correct).toBe(false);
  expect(scoreQueryScope(scenario, [{ source: "s1/refunds.md", quote: refund.text }]).correct).toBe(true);
  const extra = scoreQueryScope(scenario, [{ source: "s1/refunds.md", quote: refund.text }, { source: "s1/support.md", quote: "extra" }]);
  expect(extra.additional_sources).toEqual(["support.md"]);
  const opposition = queryScopeCases.find((item) => item.id === "export-opposition")!;
  expect(scoreQueryScope(opposition, [{ source: "s1/current-export.md", quote: queryScopeDocuments.find((item) => item.name === "current-export.md")!.text }]).missing_sources).toEqual(["legacy-export.md"]);
  expect(scoreQueryScope({ ...scenario, sources: [] }, []).correct).toBe(true);
  expect(scoreQueryScope({ ...scenario, sources: [] }, [{ source: "s1/refunds.md", quote: refund.text }]).correct).toBe(false);
});

it("rejects ambiguous scope options before output creation", () => {
  expect(queryScopeOptions(["--out", "/tmp/example"]).repeats).toBe(2);
  expect(queryScopeOptions(["--out", "/tmp/example"]).corpus).toBe("original");
  expect(queryScopeOptions(["--out", "/tmp/example", "--corpus", "policy-guard"]).corpus).toBe("policy-guard");
  for (const args of [[], ["--out", "x", "--bogus", "1"], ["--out", "x", "--out", "y"], ["--out"], ["--out", "x", "extra"], ["--out", "x", "--repeats", "0"], ["--out", "x", "--repeats", "1.5"], ["--out", "x", "--corpus", "unknown"], ["--out", "x", "--corpus"], ["--out", "x", "--corpus", "original", "--corpus", "policy-guard"]]) expect(() => queryScopeOptions(args)).toThrow();
});

it("retains policy-cued arguments while exposing implicit requests and incidental cues", () => {
  expect(policyGuardCases.slice(0, queryScopeCases.length)).toEqual(queryScopeCases);
  expect(new Set(policyGuardCases.map(({ id }) => id)).size).toBe(policyGuardCases.length);
  const terms = (id: string) => queryScopeTerms(policyGuardCases.find((item) => item.id === id)!.query, "policy-guarded-arguments");
  expect(terms("telemetry-code-argument")).toContain("telemetry");
  expect(terms("export-code-argument")).toContain("export");
  expect(terms("native-array-service-control")).not.toContain("request");
  expect(terms("implicit-telemetry")).not.toContain("telemetry");
  expect(terms("quoted-policy-cue")).toContain("request");
  expect(terms("negated-policy-cue")).toContain("request");
});

it("scores real seeded retrieval with mapped exact citations and preserves failed scope gates", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-scope-test-"));
  const out = join(root, "evidence");
  try {
    const compiled = fileURLToPath(new URL("../dist/src/evaluation/query-scope.js", import.meta.url));
    // Exit 1 is expected: all three strategies have retained acceptance failures.
    await expect(promisify(execFile)(process.execPath, [compiled, "--out", out, "--repeats", "1"], { timeout: 30_000 }))
      .rejects.toMatchObject({ code: 1 });
    const summary = JSON.parse(await readFile(join(out, "summary.json"), "utf8"));
    expect(summary.completed).toBe(true);
    expect(summary.rows).toBe(queryScopeCases.length * 2 * 3);
    expect(summary.scores.every((item: { citations_exact: boolean; caps_passed: boolean }) => item.citations_exact && item.caps_passed)).toBe(true);
    const rows = JSON.parse(await readFile(join(out, "results.json"), "utf8")) as Array<{ id: string; mode: string; strategy: string; correct: boolean }>;
    for (const mode of ["excerpts", "rules_only"]) {
      const row = (id: string, strategy: string) => rows.find((item) => item.id === id && item.mode === mode && item.strategy === strategy)!;
      expect(row("native-array-service-control", "lexical").correct).toBe(false);
      expect(row("native-array-service-control", "drop-request").correct).toBe(true);
      expect(row("telemetry-code-argument", "lexical").correct).toBe(true);
      expect(row("telemetry-code-argument", "mask-call-arguments").correct).toBe(false);
      expect(row("request-subject", "drop-request").correct).toBe(false);
    }
    await expect(promisify(execFile)(process.execPath, [compiled, "--out", out, "--repeats", "1"], { timeout: 5_000 })).rejects.toMatchObject({ code: 1 });
    expect(JSON.parse(await readFile(join(out, "summary.json"), "utf8"))).toEqual(summary);
  } finally { await rm(root, { recursive: true, force: true }); }
}, 35_000);

it("separates original gains from added recall failures in the guarded corpus", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-guard-test-"));
  try {
    const out = join(root, "evidence");
    const compiled = fileURLToPath(new URL("../dist/src/evaluation/query-scope.js", import.meta.url));
    await expect(promisify(execFile)(process.execPath, [compiled, "--out", out, "--repeats", "1", "--corpus", "policy-guard"], { timeout: 30_000 })).rejects.toMatchObject({ code: 1 });
    const summary = JSON.parse(await readFile(join(out, "summary.json"), "utf8"));
    expect(summary.completed).toBe(true);
    expect(summary.rows).toBe(policyGuardCases.length * 2 * 4);
    type Score = { mode: string; strategy: string; positive: { correct: number; total: number }; no_op: { correct: number; total: number } };
    for (const mode of ["excerpts", "rules_only"]) {
      const original = summary.subsets.original.find((item: Score) => item.mode === mode && item.strategy === "policy-guarded-arguments");
      expect(original.positive).toEqual({ correct: 15, total: 15 });
      const added = summary.subsets.counterexamples.find((item: Score) => item.mode === mode && item.strategy === "policy-guarded-arguments");
      expect(added.positive.correct).toBeLessThan(added.positive.total);
      expect(added.no_op.correct).toBeLessThan(added.no_op.total);
    }
    const rows = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
    for (const mode of ["excerpts", "rules_only"]) {
      const row = (id: string, strategy: string) => rows.find((item: { id: string; strategy: string; mode: string }) => item.id === id && item.strategy === strategy && item.mode === mode);
      expect(row("implicit-telemetry", "lexical").correct).toBe(true);
      // Consent remains outside the signature and independently recovers
      // telemetry; missing an argument term alone is not a recall failure.
      expect(row("implicit-telemetry", "policy-guarded-arguments").correct).toBe(true);
      expect(row("implicit-refund", "lexical").correct).toBe(true);
      expect(row("implicit-refund", "policy-guarded-arguments").correct).toBe(false);
      expect(row("export-code-argument", "policy-guarded-arguments").correct).toBe(true);
      expect(row("negated-policy-cue", "policy-guarded-arguments").correct).toBe(false);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}, 35_000);
