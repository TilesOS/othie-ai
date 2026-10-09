import { readFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
import { applicabilitySchema, APPLICABILITY_PROMPT, APPLICABILITY_PROMPT_VERSION } from "../src/evaluation/applicability.js";
import { prepareApplicabilityReplay, replayApplicability } from "../src/evaluation/applicability-replay.js";
import type { ModelProvider } from "../src/providers/types.js";

const text = "Support agents must acknowledge priority tickets within thirty minutes.";
const evidence = [{ id: "r1", text }];
const decision = { id: "r1", explanation: "The task asks about support.", applies: true, task_anchor: "task", evidence_anchor: "r1" };
const payload = { task: { id: "task", text: "support" }, evidence };
const messages = [{ role: "system", content: APPLICABILITY_PROMPT }, { role: "user", content: JSON.stringify(payload) }];
const generation = { stage: "applicability", messages, schema: applicabilitySchema(["r1"]), options: { thinking: false, temperature: 0, seed: 42 }, raw: { decisions: [decision] } };
const fixture = () => ({ synthetic_only: true, applicability_prompt_version: APPLICABILITY_PROMPT_VERSION,
  model: { name: "installed", digest: "original-digest" }, fixture_sha256: "fixture",
  documents: [{ name: "support.md", text, role: "authoritative" }],
  rules: [{ source: "support.md", text, quotation: text }],
  cases: [{ id: "support", query: "support", sources: ["support.md"], patterns: ["thirty minutes"] },
    { id: "noop", query: "refactor comparator", sources: [], patterns: [] }], generations: [generation],
});

it("replays identical requests in recorded order and distinguishes decision variation from explanation changes", async () => {
  let callIndex = 0;
  const generateJson = vi.fn<ModelProvider["generateJson"]>(async (sent, model, schema, _signal, options) => {
    expect(sent).toEqual(messages); expect(model).toBe("installed");
    expect(schema).toEqual(generation.schema); expect(options).toEqual(generation.options);
    const index = ++callIndex;
    return { decisions: [{ ...decision, explanation: `Reason ${index}`, ...(index === 2 ? { applies: false, task_anchor: "", evidence_anchor: "" } : {}) }] };
  });
  const saved: number[] = [];
  const result = await replayApplicability(fixture(), { generateJson } as never, { repeats: 3 }, async (row) => { saved.push(row.repeat); });
  expect(saved).toEqual([1, 2, 3]);
  expect(new Set(result.results.map((row) => row.request_sha256)).size).toBe(1);
  expect(result.results.map((row) => row.changed_ids)).toEqual([[], ["r1"], []]);
  expect(result.variation).toEqual([{ id: "support", distinct_decision_sets: 2, changed_from_recording: 1 }]);
  expect(result.scores_before_packing.positive).toEqual({ correct: 2, total: 3 });
  expect(result.skipped_cases).toEqual(["noop"]);
});

it("rejects incomplete, cross-item and late results and preserves raw failed attempts", async () => {
  const generateJson = vi.fn<ModelProvider["generateJson"]>(async () => ({ decisions: [] }));
  const invalid = await replayApplicability(fixture(), { generateJson } as never, { repeats: 1 });
  expect(invalid.valid).toBe(false); expect(invalid.results[0]?.raw).toEqual({ decisions: [] });
  expect(invalid.results[0]?.changed_ids).toBe(null);
  generateJson.mockImplementation(async () => ({ decisions: [{ ...decision, evidence_anchor: "another-item" }] }));
  expect((await replayApplicability(fixture(), { generateJson } as never, { repeats: 1 })).valid).toBe(false);
  generateJson.mockImplementation(async () => { await new Promise((done) => setTimeout(done, 15)); return { decisions: [decision] }; });
  const late = await replayApplicability(fixture(), { generateJson } as never, { repeats: 1, generation_deadline_ms: 1 });
  expect(late.valid).toBe(false); expect(late.hook_latency_valid).toBe(false);
  expect(late.results[0]?.raw).toEqual({ decisions: [decision] });
  const slow = await replayApplicability(fixture(), { generateJson } as never, { repeats: 1, hook_deadline_ms: 1 });
  expect(slow.valid).toBe(true); expect(slow.results[0]?.correct).toBe(true); expect(slow.hook_latency_valid).toBe(false);
});

it("rejects unsupported prompts, duplicate anchors/cases, changed schemas and non-authoritative evidence before any generation", async () => {
  const change = (edit: (report: ReturnType<typeof fixture>) => void) => { const report = structuredClone(fixture()); edit(report); return report; };
  const invalid = [
    { ...fixture(), synthetic_only: false },
    change((report) => { report.generations[0]!.messages[0]!.content = "changed prompt"; }),
    change((report) => { report.generations[0]!.schema = applicabilitySchema(["unknown"]); }),
    change((report) => { report.generations.push(report.generations[0]!); }),
    change((report) => { report.documents[0]!.role = "reference"; }),
    change((report) => { report.rules[0]!.quotation = "invented"; }),
    change((report) => { report.cases.push(report.cases[0]!); }),
    change((report) => { report.generations[0]!.messages[1]!.content = JSON.stringify({ ...payload, evidence: [evidence[0], evidence[0]] }); }),
  ];
  const generateJson = vi.fn<ModelProvider["generateJson"]>();
  for (const report of invalid) await expect(replayApplicability(report, { generateJson } as never)).rejects.toThrow();
  expect(generateJson).not.toHaveBeenCalled();
  expect(() => prepareApplicabilityReplay(fixture(), ["unknown"])).toThrow();
  expect(() => prepareApplicabilityReplay(fixture(), ["support", "support"])).toThrow();
  expect(() => prepareApplicabilityReplay(fixture(), ["noop"])).toThrow("No nonempty");
});

it("keeps each repeat's query order fixed and validates the committed anchor recording without a model", async () => {
  const report: unknown = JSON.parse(await readFile(new URL("../evaluation/records/2026-10-06/applicability-followup/anchors-1/quality.json", import.meta.url), "utf8"));
  const prepared = prepareApplicabilityReplay(report);
  expect(prepared.requests).toHaveLength(32);
  expect(prepared.skipped_cases).toHaveLength(8);
  const ids = ["receipt-boundary", "consent-negation", "historical-display-control"];
  const selected = prepareApplicabilityReplay(report, ids);
  let index = 0;
  const generateJson = vi.fn<ModelProvider["generateJson"]>(async (messages) => {
    const request = selected.requests[index++ % selected.requests.length]!;
    expect(messages).toEqual(request.generation.messages); return request.generation.raw;
  });
  const result = await replayApplicability(report, { generateJson } as never, { repeats: 2, cases: ids });
  expect(result.results.map((row) => row.id)).toEqual([...ids, ...ids]);
  expect(result.variation.every((row) => row.distinct_decision_sets === 1 && row.changed_from_recording === 0)).toBe(true);
});
