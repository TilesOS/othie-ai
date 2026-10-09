import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { configSchema } from "../config.js";
import { OthieEngine } from "../engine/service.js";
import { countTokens } from "../tokenizer.js";
import { EXTRACTION_PROMPT_VERSION } from "../rules/extractor.js";
import { qualityCorpus, type QualityDocument } from "./quality-cases.js";
import type { ContextBriefV1 } from "../types.js";
import { evaluateApplicability, APPLICABILITY_PROMPT_VERSION } from "./applicability.js";
import { selectQualityCandidates } from "./quality-candidates.js";
import { candidateCoverage, diagnosticScores, missingEvidencePatterns } from "./quality-metrics.js";
export { missingPatterns, missingEvidencePatterns } from "./quality-metrics.js";
import { packContext } from "../context/packing.js";

export function extractionCoverage(documents: readonly QualityDocument[], rules: readonly { source: string; quotation: string }[]) {
  return documents.map((doc) => {
    const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(doc.text)].map(({ segment }) => segment.trim()).filter(Boolean);
    const expected = new Set(doc.role === "reference" ? [] : doc.policy_sentences ?? sentences.map((_, index) => index + 1));
    const evidence = new Set(rules.filter((rule) => rule.source === doc.name).flatMap((rule) =>
      [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(rule.quotation)].map(({ segment }) => segment.trim())));
    const retained = sentences.flatMap((sentence, index) => evidence.has(sentence) ? [index + 1] : []);
    return { source: doc.name, expected_policy_sentences: [...expected], retained_sentences: retained,
      missing_policy_sentences: [...expected].filter((number) => !retained.includes(number)),
      unexpected_retained_sentences: retained.filter((number) => !expected.has(number)) };
  });
}

export const qualityOptionsSchema = z.object({
  temperature: z.number().finite().min(0).max(2).optional(),
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
  applicability: z.enum(["lexical", "semantic"]).optional(),
  candidates: z.enum(["lexical", "source-revision"]).optional(),
  hook_deadline_ms: z.number().int().min(1).max(20_000).default(2_000),
}).strict();
export type QualityOptions = z.input<typeof qualityOptionsSchema>;

export async function runModelQuality(model: string, out: string, corpusName = "standard", options: QualityOptions = {}) {
  const settings = qualityOptionsSchema.parse(options);
  const corpus = qualityCorpus(corpusName);
  const qualityDocuments = corpus.documents, qualityCases = corpus.cases;
  await mkdir(out, { recursive: false, mode: 0o700 });
  const local = async (path: string, body?: unknown) => {
    const response = await fetch(`http://127.0.0.1:11434${path}`, { ...(body ? { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
      signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok) throw new Error(`Local model metadata failed (${response.status})`);
    return response.json();
  };
  const tags = await local("/api/tags") as { models?: Array<{ name: string; digest: string }> };
  const identity = tags.models?.find((item) => item.name === model || item.name === `${model}:latest`);
  if (!identity) throw new Error("Model is not installed; this evaluator never downloads models");
  const metadata = await local("/api/show", { model }) as { license?: string; details?: unknown };
  const root = await mkdtemp(join(tmpdir(), "othie-model-quality-"));
  const docs = join(root, "policies"), reference = join(root, "reference"), state = join(root, "state");
  await mkdir(docs); await mkdir(reference); await mkdir(state);
  for (const doc of qualityDocuments) await writeFile(join(doc.role === "authoritative" ? docs : reference, doc.name), doc.text);
  const config = configSchema.parse({ version: 1, data_dir: state,
    ingestion: { concurrency: 1, watch_enabled: false, chunk_tokens: 500, overlap_tokens: 0 },
    models: { compiler: { provider: "ollama", model, revision: identity.digest, thinking: false, synthesis_deadline_ms: 20_000 } },
    profiles: { company: { sources: [
      { root: docs, role: "authoritative", authority_priority: 80, retrieval_weight: 1, global_rule_documents: [] },
      { root: reference, role: "reference", authority_priority: 20, retrieval_weight: 1, global_rule_documents: [] },
    ], permitted_exports: "rules_only", providers: { embeddings: [], extraction: ["ollama"], synthesis: [] },
    token_budget: { enabled: true, max_tokens: 500, tokenizer: "o200k_base" } } },
  });
  const engine = new OthieEngine(config, state);
  const provider = engine.providers.require(config.profiles.company!, "extraction", "ollama");
  const generate = provider.generateJson.bind(provider);
  let generationStage: "extraction" | "applicability" = "extraction";
  const generations: Array<{ stage: string; messages: unknown; schema: unknown; options: unknown; raw: unknown; wall_ms: number; error?: string }> = [];
  provider.generateJson = async (...args) => {
    args[4] = { ...args[4], ...(settings.temperature !== undefined ? { temperature: settings.temperature } : {}),
      ...(settings.seed !== undefined ? { seed: settings.seed } : {}) };
    const stage = generationStage;
    const start = performance.now();
    try {
      const raw = await generate(...args);
      generations.push({ stage, messages: args[0], schema: args[2], options: args[4] ?? null, raw, wall_ms: Math.round(performance.now() - start) });
      return raw;
    } catch (error) {
      generations.push({ stage, messages: args[0], schema: args[2], options: args[4] ?? null, raw: null, wall_ms: Math.round(performance.now() - start), error: "generation_failed" });
      throw error;
    }
  };
  const recordedAt = new Date().toISOString();
  const started = performance.now();
  let completed = false;
  try {
    await engine.start();
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const done = engine.store.db.prepare("SELECT COUNT(*) AS n FROM derived_jobs WHERE operation='extraction' AND state='done'").get() as { n: number };
      if (engine.store.listDocuments("company").filter((doc) => doc.status === "active").length === qualityDocuments.length && done.n === qualityDocuments.filter((doc) => doc.role === "authoritative").length) { completed = true; break; }
      const failed = engine.store.db.prepare("SELECT COUNT(*) AS n FROM derived_jobs WHERE operation='extraction' AND state='failed'").get() as { n: number };
      if (failed.n > 0) break;
      await new Promise((doneWaiting) => setTimeout(doneWaiting, 100));
    }
    const extractionMs = Math.round(performance.now() - started);
    const rules = engine.store.listRules("company").map((rule) => ({
      source: basename(rule.sourcePath), text: rule.text, scope: rule.applicability, category: rule.category, quotation: rule.quotation,
      citation_exact: qualityDocuments.find((doc) => doc.name === basename(rule.sourcePath) && doc.role === "authoritative")?.text.includes(rule.quotation) ?? false,
    }));
    const coverage = extractionCoverage(qualityDocuments, rules);
    const coverageValid = coverage.every((doc) => doc.missing_policy_sentences.length === 0 && doc.unexpected_retained_sentences.length === 0);
    const extractionJobs = engine.store.db.prepare(`SELECT d.path,j.state,j.attempts,j.error FROM derived_jobs j JOIN documents d ON d.id=j.document_id WHERE j.operation='extraction' ORDER BY d.path`).all() as Array<{ path: string; state: string; attempts: number; error: string | null }>;
    const results = [];
    const applicabilityResults = [];
    const candidateDiagnostics = [];
    generationStage = "applicability";
    for (const scenario of qualityCases) {
      const allRules = engine.store.listRules("company");
      const lexicalCandidates = selectQualityCandidates(allRules, scenario.query, "lexical");
      const candidates = selectQualityCandidates(allRules, scenario.query, settings.candidates ?? "lexical");
      candidateDiagnostics.push({ id: scenario.id, expected_sources: scenario.sources,
        lexical: candidateCoverage(scenario, lexicalCandidates), selected: candidateCoverage(scenario, candidates),
        candidates: candidates.map((rule) => ({ source: basename(rule.sourcePath), quotation: rule.quotation, global: rule.global })) });
      let applicable = candidates, applicabilityValid = true;
      const applicabilityStart = performance.now();
      if (settings.applicability === "semantic") {
        try {
          const selected = await evaluateApplicability({ rules: candidates, query: scenario.query, provider, model,
            signal: AbortSignal.timeout(20_000), options: { thinking: false } });
          applicable = selected.rules;
          applicabilityResults.push({ id: scenario.id, valid: true, candidate_count: candidates.length, selected_count: applicable.length,
            decisions: selected.decisions, hook_deadline_met: performance.now() - applicabilityStart < settings.hook_deadline_ms,
            wall_ms: Math.round(performance.now() - applicabilityStart) });
        } catch {
          // Keep baseline evidence for inspection, but fail both diagnostic scores.
          applicabilityValid = false;
          applicabilityResults.push({ id: scenario.id, valid: false, candidate_count: candidates.length, selected_count: null,
            decisions: [], hook_deadline_met: false, wall_ms: Math.round(performance.now() - applicabilityStart) });
        }
      }
      for (const cap of [200, 500]) {
        const began = performance.now();
        const request = { query: scenario.query, max_tokens: cap, surface: "code" as const, phase: "turn_start" as const, host: "model-quality-eval" };
        const baseline = await engine.context("company", request);
        const context = (settings.applicability === "semantic" && applicabilityValid) || (settings.applicability !== "semantic" && settings.candidates === "source-revision")
          ? packContext("company", config.profiles.company!, request, { rules: applicable, excerpts: [], keywordAvailable: true, vectorAvailable: false }, true, engine.store.getRevisionCounters())
          : baseline;
        const selected = context.brief.applicable_rules;
        const actualSources = [...new Set(selected.map((rule) => basename(rule.citation.source)))];
        const missingSources = scenario.sources.filter((source) => !actualSources.includes(source));
        const lost = missingEvidencePatterns(selected, scenario.patterns, scenario.sources);
        const budgetValid = context.status.tokenCount === countTokens(context.text, "o200k_base") && context.status.tokenCount <= cap;
        const noOp = scenario.sources.length === 0;
        const conflictValid = scenario.expected_conflicts === undefined || context.status.conflicts === scenario.expected_conflicts;
        const baselineRules = baseline.brief.applicable_rules;
        const baselineCorrect = completed && baseline.status.tokenCount === countTokens(baseline.text, "o200k_base") && baseline.status.tokenCount <= cap
          && (scenario.expected_conflicts === undefined || baseline.status.conflicts === scenario.expected_conflicts)
          && (noOp ? baselineRules.length === 0 : scenario.sources.every((source) => baselineRules.some((rule) => basename(rule.citation.source) === source))
            && missingEvidencePatterns(baselineRules, scenario.patterns, scenario.sources).length === 0);
        results.push({ id: scenario.id, cap, expected_sources: scenario.sources, actual_sources: actualSources,
          missing_sources: missingSources, missing_qualifier_patterns: lost, budget_valid: budgetValid,
          expected_conflicts: scenario.expected_conflicts ?? null, actual_conflicts: context.status.conflicts, conflict_valid: conflictValid,
          applicability_valid: applicabilityValid,
          correct: completed && applicabilityValid && budgetValid && conflictValid && (noOp ? selected.length === 0 : missingSources.length === 0 && lost.length === 0),
          ...((settings.applicability === "semantic" || settings.candidates === "source-revision") ? { lexical_baseline: baseline.brief, lexical_baseline_correct: baselineCorrect } : {}),
          retrieval_ms: Math.round(performance.now() - began), brief: context.brief });
      }
    }
    const endTags = await local("/api/tags") as typeof tags;
    const modelUnchanged = endTags.models?.find((item) => item.name === identity.name)?.digest === identity.digest;
    const qualityPassed = completed && modelUnchanged && coverageValid && results.every((result) => result.correct) && rules.every((rule) => rule.citation_exact);
    const hookLatencyValid = applicabilityResults.every((result) => result.hook_deadline_met);
    const report = { recorded_at: recordedAt, synthetic_only: true, protocol_version: "quality-v5", corpus: corpus.name, completed, model_unchanged: modelUnchanged,
      model: identity, runtime: await local("/api/version"), platform: process.platform, node: process.version, prompt_version: EXTRACTION_PROMPT_VERSION,
      fixture_sha256: createHash("sha256").update(JSON.stringify({ qualityDocuments, qualityCases })).digest("hex"),
      generation_settings: { thinking: false, ...(settings.temperature !== undefined ? { temperature: settings.temperature } : {}),
        ...(settings.seed !== undefined ? { seed: settings.seed } : {}) },
      applicability_mode: settings.applicability ?? "lexical",
      applicability_prompt_version: settings.applicability === "semantic" ? APPLICABILITY_PROMPT_VERSION : null,
      applicability_results: applicabilityResults,
      candidate_mode: settings.candidates ?? "lexical", candidate_diagnostics: candidateDiagnostics,
      diagnostic_scores: diagnosticScores(results),
      lexical_diagnostic_scores: diagnosticScores(results.map((result) => ({ ...result, correct: result.lexical_baseline_correct ?? result.correct }))),
      hook_deadline_ms: settings.hook_deadline_ms, hook_latency_valid: hookLatencyValid,
      hook_latency_scope: "Filtering time only; excludes hook stdin, process startup, retrieval and transport. Passing is necessary, not sufficient, for native-hook acceptance.",
      license: { artifact_details: metadata.details ?? null, license_present: !!metadata.license,
        license_sha256: metadata.license ? createHash("sha256").update(metadata.license).digest("hex") : null,
        review: "Artifact redistribution license/notice review pending; this experiment redistributes no model weights." },
      documents: qualityDocuments, cases: qualityCases, generations, rules, extraction_ms: extractionMs,
      extraction_coverage: coverage, extraction_coverage_valid: coverageValid,
      extraction_jobs: extractionJobs.map((job) => ({ source: basename(job.path), state: job.state, attempts: job.attempts, error_present: job.error !== null })),
      all_retained_citations_exact: rules.every((rule) => rule.citation_exact), reference_promoted: rules.some((rule) => rule.source === "vendor-guide.md"),
      results, quality_passed: qualityPassed, passed: qualityPassed && hookLatencyValid,
      limitations: "Small fixed synthetic corpus. Expected policy sentence coverage is fixture-specific, not a general semantic classifier. Regex qualifier checks are lexical diagnostics, not semantic entailment or unsupported-claim proof. Raw generations, explicit exclusions, and retained rules require review. Embeddings and synthesis disabled. Optional semantic applicability and source-revision candidate overfetch are evaluation-only. Overfetch can add unrelated requirements; filtering cannot restore evidence absent from its input. Exact quote validation does not establish semantic truth. Conflicts are explicit-opposition diagnostics only. Controlled settings do not guarantee determinism or independent samples. No statistical generalization or model redistribution license approval.",
    };
    await writeFile(join(out, "quality.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return report;
  } finally {
    await engine.stop();
    // Preserve raw generations even when a later step fails.
    await writeFile(join(out, "generations.json"), JSON.stringify(generations, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await rm(root, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name: string) => { const index = process.argv.indexOf(`--${name}`); return index < 0 ? undefined : process.argv[index + 1]; };
  const out = resolve(arg("out") ?? `packages/engine/evaluation/results/quality-${Date.now()}`);
  await mkdir(resolve(out, ".."), { recursive: true });
  const options = { ...(arg("temperature") !== undefined ? { temperature: Number(arg("temperature")) } : {}),
    ...(arg("seed") !== undefined ? { seed: Number(arg("seed")) } : {}),
    ...(arg("applicability") !== undefined ? { applicability: arg("applicability") as QualityOptions["applicability"] } : {}),
    ...(arg("candidates") !== undefined ? { candidates: arg("candidates") as QualityOptions["candidates"] } : {}),
    ...(arg("hook-deadline-ms") !== undefined ? { hook_deadline_ms: Number(arg("hook-deadline-ms")) } : {}) };
  void runModelQuality(arg("model") ?? "qwen3.5:4b-mlx", out, arg("corpus"), options).then((report) => {
    process.stdout.write(JSON.stringify({ report: join(out, "quality.json"), passed: report.passed, correct: report.results.filter((result) => result.correct).length, total: report.results.length }) + "\n");
    if (!report.passed) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Model quality evaluation failed; inspect preserved generations.\n"); process.exitCode = 1; });
}
