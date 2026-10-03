import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runModelQuality } from "../src/evaluation/model-quality.js";

describe.skipIf(process.env.RUN_OTHIE_MODEL_TESTS !== "1")("real-model quality", () => {
  it("records compiler quality and verifies citation, budget, and reference isolation", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-quality-suite-"));
    // Preserve the report in the ignored results directory when explicitly requested.
    const out = process.env.OTHIE_MODEL_RESULTS ? resolve(process.env.OTHIE_MODEL_RESULTS) : join(root, "results");
    await mkdir(resolve(out, ".."), { recursive: true });
    try {
      const report = await runModelQuality(process.env.OTHIE_MODEL ?? "qwen3.5:4b-mlx", out);
      expect(report.completed).toBe(true); expect(report.model_unchanged).toBe(true);
      expect(report.all_retained_citations_exact).toBe(true); expect(report.reference_promoted).toBe(false);
      expect(report.results).toHaveLength(14);
      expect(report.results.every((result) => result.budget_valid)).toBe(true);
      process.stderr.write(`Compiler qualifier/source diagnostics: ${report.results.filter((result) => result.correct).length}/${report.results.length}; report.passed=${report.passed}\n`);
      // Diagnostic quality failures are reported separately from these safety checks.
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 240_000);
});
