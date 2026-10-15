import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { runHookLatency } from "../src/evaluation/hook-default-latency.js";

it("records complete adapter processes with default deadlines despite inherited overrides and preserves existing evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-latency-test-")), out = join(root, "records");
  vi.stubEnv("OTHIE_CODEX_DEADLINE_MS", "1");
  vi.stubEnv("OTHIE_CLAUDE_CODE_DEADLINE_MS", "1");
  try {
    const summary = await runHookLatency(out, 1);
    expect(summary.records).toHaveLength(8);
    // Latency acceptance remains a measured result, not a CI speed requirement.
    // Delivery either completes or fails open at the real default, never at 1 ms.
    for (const record of summary.records) {
      expect(record.code).toBe(0);
      expect(record.timed_out).toBe(false);
      expect(record.diagnostics?.elapsed_ms).toBeGreaterThan(1);
      expect(record.passed).toBe(record.delivery_passed && record.hook_deadline_met);
      if (record.diagnostics?.outcome === "context_timeout") {
        expect(record.diagnostics.elapsed_ms).toBeGreaterThanOrEqual(1_999);
        expect(record.delivery_passed).toBe(false);
      } else expect(record.delivery_passed).toBe(true);
      expect(record.stderr).not.toMatch(/PRIVATE|credential|transcript|session|workspace/);
      expect(JSON.parse(await readFile(join(out, `${record.condition}-${record.host}-1.json`), "utf8"))).toEqual(record);
    }
    expect(summary.passed).toBe(summary.records.every((row) => row.passed));
    expect(await readdir(out)).toHaveLength(10);
    const original = await readFile(join(out, "summary.json"), "utf8");
    await expect(runHookLatency(out, 1)).rejects.toMatchObject({ code: "EEXIST" });
    expect(await readFile(join(out, "summary.json"), "utf8")).toBe(original);
    for (const count of [0, 11, NaN]) await expect(runHookLatency(out, count)).rejects.toThrow("Repeats");
  } finally { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); }
}, 30_000);
