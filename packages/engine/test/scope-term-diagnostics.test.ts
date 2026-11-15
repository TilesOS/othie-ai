import { expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { scopeTermInterventions, scopeTermMatches } from "../src/evaluation/scope-term-diagnostics.js";

it("traces whole-word sentence matches without treating disclaimers as policy assertions", () => {
  const documents = [{ name: "guide.md", text: "Use clear sentences. This reference does not define storage limits. Storage must not exceed its limit." }];
  expect(scopeTermMatches(["use", "storage", "limit", "limits", "use"], documents)).toEqual([
    { source: "guide.md", sentences: [
      { index: 0, text: "Use clear sentences.", terms: ["use"] },
      { index: 1, text: "This reference does not define storage limits.", terms: ["storage", "limits"] },
      { index: 2, text: "Storage must not exceed its limit.", terms: ["storage", "limit"] },
    ] },
  ]);
  expect(documents[0]!.text).toContain("does not define storage limits");
});

it("retains exceptions, negative rules and both opposing sources in the trace", () => {
  const documents = [
    { name: "current.md", text: "Operators may deploy on Friday. Except during a freeze, deployment is allowed." },
    { name: "legacy.md", text: "Operators must not deploy on Friday." },
  ];
  expect(scopeTermMatches(["deploy", "freeze"], documents)).toEqual([
    { source: "current.md", sentences: [
      { index: 0, text: documents[0]!.text.split(". ")[0] + ".", terms: ["deploy"] },
      { index: 1, text: "Except during a freeze, deployment is allowed.", terms: ["freeze"] },
    ] },
    { source: "legacy.md", sentences: [{ index: 0, text: documents[1]!.text, terms: ["deploy"] }] },
  ]);
});

it("uses the production word boundary convention for Unicode and exact inflections", () => {
  const documents = [{ name: "unicode.md", text: "CAFÉ requests café2." }];
  expect(scopeTermMatches(["café", "request", "café2"], documents)[0]!.sentences[0]!.terms).toEqual(["café", "café2"]);
  expect(scopeTermInterventions(["request", "café", "unmatched"], documents)).toEqual([
    { kind: "only-term", term: "café", terms: ["café"] },
    { kind: "without-term", term: "café", terms: ["request", "unmatched"] },
  ]);
});

it("bounds probes to matching terms without dropping unmatched or late query terms", () => {
  const prefix = Array.from({ length: 4000 }, (_, index) => `preface${index}`);
  const terms = [...prefix, "deploy", "deploy", "freeze"];
  const documents = [{ name: "release.md", text: "Deploy only outside a freeze." }];
  const probes = scopeTermInterventions(terms, documents);
  expect(probes).toHaveLength(4);
  expect(probes[1]).toEqual({ kind: "without-term", term: "deploy", terms: [...prefix, "freeze"] });
  expect(scopeTermInterventions(["absent"], documents)).toEqual([]);
  expect(scopeTermInterventions([], documents)).toEqual([]);
  expect(scopeTermInterventions(["deploy"], documents)[1]!.terms).toEqual([]);
});

it("rejects unsupported or ambiguous diagnostic selection", () => {
  expect(queryScopeOptions(["--out", "x", "--corpus", "qualified-bindings", "--diagnostics", "term-ablation"]).diagnostics).toBe("term-ablation");
  expect(queryScopeOptions(["--out", "x"]).diagnostics).toBeUndefined();
  for (const args of [
    ["--diagnostics", "unknown"], ["--diagnostics", "term-ablation"],
    ["--corpus", "scope-transfer", "--diagnostics"],
    ["--corpus", "scope-transfer", "--diagnostics", "term-ablation", "--diagnostics", "term-ablation"],
  ]) expect(() => queryScopeOptions(["--out", "x", ...args])).toThrow();
});

it("probes real stores without changing baseline rows, scores or acceptance", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-term-test-"));
  const compiled = fileURLToPath(new URL("../dist/src/evaluation/query-scope.js", import.meta.url));
  const json = async (run: string, file: string) => JSON.parse(await readFile(join(root, run, file), "utf8"));
  try {
    await Promise.all(["baseline", "diagnostic"].map(async (run) => {
      const args = [compiled, "--out", join(root, run), "--corpus", "scope-transfer", "--repeats", "1"];
      if (run === "diagnostic") args.push("--diagnostics", "term-ablation");
      await expect(promisify(execFile)(process.execPath, args, { timeout: 30_000 })).rejects.toMatchObject({ code: 1 });
    }));
    type Row = { component_wall_ms: number; [key: string]: unknown };
    const stable = (rows: Row[]) => rows.map(({ component_wall_ms, ...row }) => row);
    expect(stable(await json("diagnostic", "results.json"))).toEqual(stable(await json("baseline", "results.json")));
    expect(await json("diagnostic", "summary.json")).toEqual(await json("baseline", "summary.json"));
    await expect(json("baseline", "term-diagnostics.json")).rejects.toMatchObject({ code: "ENOENT" });
    const diagnostic = await json("diagnostic", "term-diagnostics.json");
    expect(diagnostic.protocol).toBe("scope-term-ablation-v1");
    expect(diagnostic.cases).toHaveLength(60);
    expect(diagnostic.probe_count).toBe(diagnostic.cases.reduce((sum: number, row: { interventions: unknown[] }) => sum + row.interventions.length, 0));
    for (const mode of ["excerpts", "rules_only"]) {
      const row = (id: string) => diagnostic.cases.find((item: { id: string; mode: string }) => item.id === id && item.mode === mode);
      type Probe = { kind: string; term: string; result: { actual_sources: string[]; evidence: { quote: string }[]; citations_exact: boolean; cap_passed: boolean } };
      const only = (id: string, term: string): Probe => row(id).interventions.find((probe: Probe) => probe.kind === "only-term" && probe.term === term);
      expect(only("transfer-upload-code", "upload").result.actual_sources).toEqual(["editorial.md", "upload.md"]);
      expect(only("transfer-upload-code", "use").result.actual_sources).toEqual(["editorial.md"]);
      expect(only("transfer-deployment-code", "deploy").result.actual_sources).toEqual(["current-deployment.md", "legacy-deployment.md"]);
      expect(only("transfer-negative-rule", "guest").result.evidence.some((item) => item.quote.includes("cannot be renewed"))).toBe(true);
      expect(row("transfer-plain-numbers").interventions).toEqual([]);
    }
    expect(diagnostic.cases.every((row: { interventions: { result: { citations_exact: boolean; cap_passed: boolean } }[] }) =>
      row.interventions.every(({ result }) => result.citations_exact && result.cap_passed))).toBe(true);
  } finally { await rm(root, { recursive: true, force: true }); }
}, 35_000);
