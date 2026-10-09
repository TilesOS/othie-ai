import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { HttpModelProvider } from "../providers/http.js";
import type { GenerationOptions, JsonMessage, ModelProvider } from "../providers/types.js";
import type { RuleRecord } from "../types.js";
import { conflictGroups } from "../rules/selection.js";
import { APPLICABILITY_PROMPT, APPLICABILITY_PROMPT_VERSION, applicabilitySchema, validateAnchoredApplicability } from "./applicability.js";
import { candidateCoverage, diagnosticScores } from "./quality-metrics.js";

const caseSchema = z.object({ id: z.string().min(1), query: z.string().min(1), sources: z.array(z.string()),
  patterns: z.array(z.string()), expected_conflicts: z.number().int().nonnegative().optional() });
const generationSchema = z.object({ stage: z.string(), messages: z.array(z.object({ role: z.enum(["system", "user"]), content: z.string() })),
  schema: z.record(z.string(), z.unknown()), options: z.object({ thinking: z.boolean(), temperature: z.number().min(0).max(2).optional(),
    seed: z.number().int().min(0).max(2_147_483_647).optional() }).strict(), raw: z.unknown() });
const reportSchema = z.object({ synthetic_only: z.literal(true), applicability_prompt_version: z.literal(APPLICABILITY_PROMPT_VERSION),
  model: z.object({ name: z.string().min(1), digest: z.string().min(1) }), fixture_sha256: z.string(),
  documents: z.array(z.object({ name: z.string(), role: z.enum(["authoritative", "reference"]), text: z.string() })),
  cases: z.array(caseSchema), rules: z.array(z.object({ source: z.string(), text: z.string(), quotation: z.string() })),
  // Extraction generations have a different schema/options; parse only replayed requests below.
  generations: z.array(z.object({ stage: z.string() }).passthrough()),
});
const payloadSchema = z.object({ task: z.object({ id: z.literal("task"), text: z.string().min(1) }).strict(),
  evidence: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) }).strict()).min(1) }).strict();
export const replayOptionsSchema = z.object({ repeats: z.number().int().min(1).max(10).default(3),
  hook_deadline_ms: z.number().int().min(1).max(20_000).default(2_000),
  generation_deadline_ms: z.number().int().min(1).max(20_000).default(20_000),
  cases: z.array(z.string().min(1)).min(1).optional() }).strict();
export type ReplayOptions = z.input<typeof replayOptionsSchema>;
function scoreSelection(scenario: { id: string; query: string; sources: string[]; patterns: string[]; expected_conflicts?: number }, rules: RuleRecord[]) {
  const coverage = candidateCoverage(scenario, rules);
  const conflicts = conflictGroups(rules).length;
  return { coverage, conflicts, correct: coverage.complete && (scenario.expected_conflicts === undefined || conflicts === scenario.expected_conflicts) };
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Freeze the recorded request, including candidate order and anchors. Reject inputs
 * that cannot be traced to retained original authoritative evidence. */
export function prepareApplicabilityReplay(raw: unknown, caseIds?: string[]) {
  const report = reportSchema.parse(raw);
  if (new Set(report.cases.map((item) => item.id)).size !== report.cases.length
    || new Set(report.cases.map((item) => item.query)).size !== report.cases.length) throw new Error("Ambiguous replay cases");
  if (caseIds && (new Set(caseIds).size !== caseIds.length || caseIds.some((id) => !report.cases.some((item) => item.id === id)))) throw new Error("Unknown or duplicate replay case");
  const seen = new Set<string>();
  const requests = report.generations.filter((item) => item.stage === "applicability").map((item) => {
    const generation = generationSchema.parse(item);
    if (generation.messages.length !== 2 || generation.messages[0]?.role !== "system"
      || generation.messages[0].content !== APPLICABILITY_PROMPT || generation.messages[1]?.role !== "user") throw new Error("Unsupported replay prompt");
    const payload = payloadSchema.parse(JSON.parse(generation.messages[1].content));
    const scenario = report.cases.find((item) => item.query === payload.task.text);
    if (!scenario || seen.has(scenario.id)) throw new Error("Unknown or duplicate replay request");
    seen.add(scenario.id);
    if (new Set(payload.evidence.map((item) => item.id)).size !== payload.evidence.length
      || JSON.stringify(generation.schema) !== JSON.stringify(applicabilitySchema(payload.evidence.map((item) => item.id)))) throw new Error("Invalid replay schema or anchors");
    const rules: RuleRecord[] = payload.evidence.map((item) => {
      const originals = report.rules.filter((rule) => rule.quotation === item.text);
      if (originals.length !== 1) throw new Error("Ambiguous or missing replay evidence");
      const original = originals[0]!;
      if (!report.documents.some((doc) => doc.name === original.source && doc.role === "authoritative" && doc.text.includes(original.quotation))) throw new Error("Replay evidence lacks authoritative provenance");
      return { id: item.id, text: original.text, quotation: original.quotation, sourcePath: original.source,
        profile: "replay", documentId: original.source, revisionId: "frozen", location: "recorded evidence",
        authorityPriority: 80, global: false, category: "", applicability: "", modelIdentity: report.model.digest, promptVersion: "recorded" };
    });
    const baseline = validateAnchoredApplicability(generation.raw, scenario.query, payload.evidence);
    const replayScenario = { id: scenario.id, query: scenario.query, sources: scenario.sources, patterns: scenario.patterns,
      ...(scenario.expected_conflicts !== undefined ? { expected_conflicts: scenario.expected_conflicts } : {}) };
    const options: GenerationOptions = { thinking: generation.options.thinking,
      ...(generation.options.temperature !== undefined ? { temperature: generation.options.temperature } : {}),
      ...(generation.options.seed !== undefined ? { seed: generation.options.seed } : {}) };
    return { scenario: replayScenario, generation: { ...generation, options }, evidence: payload.evidence, rules, baseline,
      request_sha256: hash({ model: report.model, messages: generation.messages, schema: generation.schema, options: generation.options }) };
  });
  const selected = requests.filter((item) => !caseIds || caseIds.includes(item.scenario.id));
  if (!selected.length) throw new Error("No nonempty applicability requests to replay");
  return { report, requests: selected, skipped_cases: report.cases.filter((item) => (!caseIds || caseIds.includes(item.id)) && !seen.has(item.id)).map((item) => item.id) };
}

/** Run repeats in the same recorded case order, without extraction or re-ranking.
 * Callback persists each raw response before the next request starts. */
export async function replayApplicability(raw: unknown, provider: ModelProvider, options: ReplayOptions = {},
  onResult?: (result: ReplayResult) => Promise<void>) {
  const settings = replayOptionsSchema.parse(options);
  const prepared = prepareApplicabilityReplay(raw, settings.cases);
  const results: ReplayResult[] = [];
  for (let repeat = 1; repeat <= settings.repeats; repeat++) for (const request of prepared.requests) {
    const began = performance.now();
    const signal = AbortSignal.timeout(settings.generation_deadline_ms);
    let response: unknown = null;
    try {
      // Send recorded strings, schema and sampling options byte-for-byte in their existing order.
      response = await provider.generateJson(request.generation.messages as JsonMessage[], prepared.report.model.name,
        request.generation.schema, signal, request.generation.options);
      signal.throwIfAborted();
      const decisions = validateAnchoredApplicability(response, request.scenario.query, request.evidence);
      const retained = new Set(decisions.filter((item) => item.applies).map((item) => item.id));
      const selected = request.rules.filter((rule) => retained.has(rule.id));
      const score = scoreSelection(request.scenario, selected);
      results.push({ repeat, id: request.scenario.id, request_sha256: request.request_sha256, raw: response, valid: true,
        decisions, changed_ids: decisions.filter((item) => item.applies !== request.baseline.find((original) => original.id === item.id)!.applies).map((item) => item.id).sort(),
        expected_sources: request.scenario.sources, ...score,
        hook_deadline_met: performance.now() - began < settings.hook_deadline_ms, wall_ms: Math.round(performance.now() - began) });
    } catch {
      results.push({ repeat, id: request.scenario.id, request_sha256: request.request_sha256, raw: response, valid: false,
        decisions: [], changed_ids: null, expected_sources: request.scenario.sources, coverage: null, conflicts: null,
        correct: false, hook_deadline_met: false, wall_ms: Math.round(performance.now() - began) });
    }
    await onResult?.(results[results.length - 1]!);
  }
  const signatures = (rows: ReplayResult[]) => new Set(rows.filter((row) => row.valid).map((row) =>
    JSON.stringify(row.decisions.map(({ id, applies }) => ({ id, applies })).sort((a, b) => a.id.localeCompare(b.id)))));
  const variation = prepared.requests.map((request) => ({ id: request.scenario.id,
    distinct_decision_sets: signatures(results.filter((item) => item.id === request.scenario.id)).size,
    invalid_attempts: results.filter((item) => item.id === request.scenario.id && !item.valid).length,
    changed_from_recording: results.filter((item) => item.id === request.scenario.id && (item.changed_ids?.length ?? 0) > 0).length }));
  const recordedDiagnostics = prepared.requests.map((request) => {
    const ids = new Set(request.baseline.filter((item) => item.applies).map((item) => item.id));
    return { id: request.scenario.id, expected_sources: request.scenario.sources,
      ...scoreSelection(request.scenario, request.rules.filter((rule) => ids.has(rule.id))) };
  });
  return { results, variation, recorded_diagnostics_before_packing: recordedDiagnostics,
    recorded_scores_before_packing: diagnosticScores(recordedDiagnostics), skipped_cases: prepared.skipped_cases,
    scores_before_packing: diagnosticScores(results),
    hook_latency_valid: results.every((item) => item.hook_deadline_met),
    valid: results.every((item) => item.valid), settings };
}

type ReplayDecision = ReturnType<typeof validateAnchoredApplicability>[number];
export interface ReplayResult {
  repeat: number; id: string; request_sha256: string; raw: unknown; valid: boolean;
  decisions: ReplayDecision[]; changed_ids: string[] | null; expected_sources: string[];
  coverage: ReturnType<typeof candidateCoverage> | null; conflicts: number | null;
  correct: boolean; hook_deadline_met: boolean; wall_ms: number;
}

export async function runApplicabilityReplay(input: string, out: string, options: ReplayOptions = {}) {
  const source = await readFile(input, "utf8");
  const raw: unknown = JSON.parse(source);
  const settings = replayOptionsSchema.parse(options);
  const prepared = prepareApplicabilityReplay(raw, settings.cases);
  // Fixed approved loopback runtime. No downloaded models or remote exports.
  const provider = new HttpModelProvider("ollama", { id: "ollama", kind: "ollama",
    base_url: "http://127.0.0.1:11434", allowed_redirect_origins: [] });
  const local = async (path: string) => {
    const response = await fetch(`http://127.0.0.1:11434${path}`, { signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok) throw new Error("Replay metadata unavailable");
    return response.json();
  };
  const installedIdentity = async () => {
    const tags = await local("/api/tags") as { models?: Array<{ name: string; digest: string }> };
    return tags.models?.find((item) => item.name === prepared.report.model.name);
  };
  const model = await installedIdentity();
  if (!model || model.digest !== prepared.report.model.digest) throw new Error("Recorded model digest is not installed; replay never downloads models");
  await mkdir(out, { recursive: false, mode: 0o700 });
  const protocol = { recorded_at: new Date().toISOString(), synthetic_only: true, protocol_version: "applicability-replay-v1",
    input_sha256: createHash("sha256").update(source).digest("hex"), fixture_sha256: prepared.report.fixture_sha256,
    model, runtime: await local("/api/version"), platform: process.platform, node: process.version, settings,
    requests: prepared.requests.map(({ scenario, generation, request_sha256 }) => ({ id: scenario.id, request_sha256,
      messages: generation.messages, schema: generation.schema, options: generation.options })),
    limitations: "Recorded inputs, candidate ordering, prompts, schemas and requested settings stay fixed. No fresh extraction, engine startup, re-ranking or packing. Scores check pre-packing source/qualifier/conflict diagnostics and are not comparable to packed quality-v5 totals. Invalid responses fail; raw attempts are saved. Hook latency measures only generation and validation, excluding other hook work. Warm state and runtime implementation remain uncontrolled. Repeats are not independent samples; controlled settings do not guarantee determinism. No general semantic or native-host acceptance claim." };
  await writeFile(join(out, "protocol.json"), JSON.stringify(protocol, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  const result = await replayApplicability(raw, provider, settings, async (row) => {
    const index = prepared.requests.findIndex((item) => item.scenario.id === row.id);
    await writeFile(join(out, `repeat-${row.repeat}-case-${index + 1}.json`), JSON.stringify(row, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  });
  const modelUnchanged = (await installedIdentity())?.digest === model.digest;
  const summary = { ...protocol, ...result, model_unchanged: modelUnchanged,
    passed: modelUnchanged && result.valid && result.hook_latency_valid && result.results.every((item) => item.correct) };
  await writeFile(join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name: string) => { const index = process.argv.indexOf(`--${name}`); return index < 0 ? undefined : process.argv[index + 1]; };
  try {
    const input = arg("input");
    if (!input) throw new Error("A synthetic quality.json input is required");
    const out = resolve(arg("out") ?? `packages/engine/evaluation/results/replay-${Date.now()}`);
    await mkdir(resolve(out, ".."), { recursive: true });
    const report = await runApplicabilityReplay(input, out, {
      ...(arg("repeats") !== undefined ? { repeats: Number(arg("repeats")) } : {}),
      ...(arg("hook-deadline-ms") !== undefined ? { hook_deadline_ms: Number(arg("hook-deadline-ms")) } : {}),
      ...(arg("generation-deadline-ms") !== undefined ? { generation_deadline_ms: Number(arg("generation-deadline-ms")) } : {}),
      ...(arg("cases") !== undefined ? { cases: arg("cases")!.split(",") } : {}),
    });
    process.stdout.write(JSON.stringify({ report: join(out, "summary.json"), passed: report.passed, scores_before_packing: report.scores_before_packing,
      varying_cases: report.variation.filter((item) => item.distinct_decision_sets > 1).length }) + "\n");
    if (!report.passed) process.exitCode = 1;
  } catch {
    process.stderr.write("Applicability replay failed; inspect any preserved protocol/attempt files.\n"); process.exitCode = 1;
  }
}
