import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { queryScopeDocuments } from "../src/evaluation/query-scope-cases.js";
import { queryScopeOptions, qualifiedBindingStrategies, scoreQueryScope } from "../src/evaluation/query-scope.js";
import { scopeTransferCases, scopeTransferDocuments } from "../src/evaluation/scope-transfer-cases.js";

it("scores complete transfer evidence against its own documents", () => {
  const scenario = scopeTransferCases.find((item) => item.id === "transfer-deployment-opposition")!;
  const evidence = scopeTransferDocuments.filter((item) => scenario.sources.includes(item.name))
    .map((item) => ({ source: `s1/${item.name}`, quote: item.text }));
  expect(scoreQueryScope(scenario, evidence, scopeTransferDocuments).precise_correct).toBe(true);
  expect(scoreQueryScope(scenario, evidence.slice(0, 1), scopeTransferDocuments).correct).toBe(false);
  expect(scoreQueryScope(scenario, evidence.map((item) => ({ ...item, quote: "Operators may deploy" })), scopeTransferDocuments).correct).toBe(false);
  expect(() => scoreQueryScope(scenario, evidence)).toThrow("Unknown scope fixture source");
  expect(scopeTransferDocuments.some((item) => queryScopeDocuments.some((old) => old.name === item.name))).toBe(false);
});

it("requires explicit transfer selection and retains the original default", () => {
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-transfer"]).corpus).toBe("scope-transfer");
  expect(queryScopeOptions(["--out", "x"]).corpus).toBe("original");
});

it("runs all frozen strategies against transfer stores in both export modes", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-transfer-test-"));
  try {
    const out = join(root, "evidence");
    const compiled = fileURLToPath(new URL("../dist/src/evaluation/query-scope.js", import.meta.url));
    await expect(promisify(execFile)(process.execPath, [compiled, "--out", out, "--repeats", "1", "--corpus", "scope-transfer"], { timeout: 30_000 })).rejects.toMatchObject({ code: 1 });
    const protocol = JSON.parse(await readFile(join(out, "protocol.json"), "utf8"));
    const summary = JSON.parse(await readFile(join(out, "summary.json"), "utf8"));
    const rows = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
    expect(protocol.documents).toEqual(scopeTransferDocuments);
    expect(protocol.cases).toEqual(scopeTransferCases);
    expect(protocol.strategies).toEqual(qualifiedBindingStrategies);
    expect(protocol.artifacts["scope-transfer-cases.js"]).toMatch(/^[a-f0-9]{64}$/);
    expect(summary.completed).toBe(true);
    expect(summary.rows).toBe(420);
    expect(summary.subsets).toEqual({ transfer: summary.scores });
    expect(summary.all_precise_correct).toBe(false);
    for (const mode of ["excerpts", "rules_only"]) {
      const row = (id: string, strategy: string) => rows.find((item: { id: string; strategy: string; mode: string }) => item.id === id && item.strategy === strategy && item.mode === mode);
      expect(row("transfer-deployment-opposition", "lexical").correct).toBe(true);
      expect(row("transfer-negative-rule", "lexical").correct).toBe(true);
      expect(row("transfer-upload-code", "mask-call-arguments").correct).toBe(false);
      expect(row("transfer-upload-code", "qualified-bindings").correct).toBe(true);
      expect(row("transfer-plain-numbers", "qualified-bindings").precise_correct).toBe(true);
    }
    expect(rows.every((row: { actual_sources: string[]; citations_exact: boolean; cap_passed: boolean }) =>
      row.citations_exact && row.cap_passed && row.actual_sources.every((source) => scopeTransferDocuments.some((document) => document.name === source)))).toBe(true);
  } finally { await rm(root, { recursive: true, force: true }); }
}, 35_000);
