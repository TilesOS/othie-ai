import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { beforeAll, expect, it } from "vitest";
import { parserGlobCases } from "./lint-parser-fixtures";

type Trace = {
  matches: { pattern: string; options: Record<string, unknown> }[];
  preprocess: { optimization_level: number; input_parts: number; output_parts: number }[];
  first_phase: unknown[];
  second_phase: unknown[];
};
type ParserCheck = { id: string; expected: string; outcome: string; type: string | null; trace: Trace };
let report: {
  protocol: string;
  website: { project: unknown; project_service: unknown; fatal_errors: number; messages: unknown[]; trace: Trace }[];
  parser: ParserCheck[];
  controls: { requested_level: number | null; resulting_parts: number; trace: Trace }[];
};

beforeAll(async () => {
  // Keep cache/prototype instrumentation isolated from Vitest and other tests.
  // The subprocess deadline also bounds the tiny level-two branch control.
  const probe = fileURLToPath(new URL("./lint-parser-reachability-probe.mjs", import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, [probe], { timeout: 30_000, maxBuffer: 1024 * 1024 });
  report = JSON.parse(stdout);
  expect(report.protocol).toBe("parser-minimatch-reachability-v1");
}, 35_000);

it("keeps the affected parser matcher inactive under the installed website config", () => {
  expect(report.website).toHaveLength(2);
  for (const row of report.website) {
    expect(row.project).toBeFalsy();
    expect(row.project_service).toBeFalsy();
    expect(row.fatal_errors).toBe(0);
    expect(row.messages).toEqual([]);
    expect(row.trace).toEqual({ matches: [], preprocess: [], first_phase: [], second_phase: [] });
  }
});

it("preserves typed parser judgments while observing only default level-one matching", () => {
  const rows = report.parser.slice(0, parserGlobCases.length);
  expect(rows.map(row => row.id)).toEqual(parserGlobCases.map(row => row.id));
  let matchCount = 0;
  for (const [index, row] of rows.entries()) {
    expect(row.outcome, row.id).toBe(parserGlobCases[index]!.expected);
    expect(row.type).toBe(row.outcome === "typed" ? "number" : null);
    const shouldMatch = parserGlobCases[index]!.pattern !== null && row.expected !== "invalid-pattern";
    expect(row.trace.matches).toHaveLength(shouldMatch ? 1 : 0);
    expect(row.trace.preprocess).toHaveLength(shouldMatch ? 1 : 0);
    for (const match of row.trace.matches) {
      expect(match.pattern).toBe(parserGlobCases[index]!.pattern);
      expect(match.options).toEqual({ dot: true });
      matchCount++;
    }
    expect(row.trace.first_phase).toEqual([]);
    expect(row.trace.second_phase).toEqual([]);
    expect(row.trace.preprocess.every(call => call.optimization_level === 1)).toBe(true);
  }
  expect(matchCount).toBeGreaterThan(0);
});

it("rejects globstar-parent patterns before they reach the dependency matcher", () => {
  const guards = report.parser.slice(parserGlobCases.length);
  expect(guards).toHaveLength(3);
  for (const row of guards) {
    expect(row.outcome).toBe("invalid-pattern");
    expect(row.type).toBeNull();
    expect(row.trace).toEqual({ matches: [], preprocess: [], first_phase: [], second_phase: [] });
  }
});

it("detects both level-two preprocessing phases with a bounded positive control", () => {
  expect(report.controls.map(row => row.requested_level)).toEqual([null, 1, 2]);
  for (const row of report.controls) {
    expect(row.trace.preprocess).toHaveLength(1);
    expect(row.trace.preprocess[0]!.optimization_level).toBe(row.requested_level ?? 1);
    expect(row.trace.matches).toEqual([]);
    expect(row.resulting_parts).toBeGreaterThan(0);
    if (row.requested_level === 2) {
      expect(row.trace.first_phase).toHaveLength(1);
      expect(row.trace.second_phase).toHaveLength(1);
      expect(row.resulting_parts).toBeGreaterThan(1);
    } else {
      expect(row.trace.first_phase).toEqual([]);
      expect(row.trace.second_phase).toEqual([]);
      expect(row.resulting_parts).toBe(1);
    }
  }
});
