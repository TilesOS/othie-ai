import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { configSchema } from "../config.js";
import { OthieEngine } from "../engine/service.js";
import { countTokens } from "../tokenizer.js";
import { EXTRACTION_PROMPT_VERSION } from "../rules/extractor.js";
import { qualityCases, qualityDocuments } from "./quality-cases.js";
import type { ContextBriefV1 } from "../types.js";

export function missingPatterns(text: string, patterns: readonly string[]): string[] {
  return patterns.filter((pattern) => !new RegExp(pattern, "i").test(text));
}
export function missingEvidencePatterns(rules: ContextBriefV1["applicable_rules"], patterns: readonly string[], sources?: readonly string[]): string[] {
  // Generated labels are advisory metadata and may not be sent to the host.
  // They cannot establish that a qualifier survived in packed policy evidence.
  const evidence = sources ? rules.filter((rule) => sources.includes(basename(rule.citation.source))) : rules;
  return missingPatterns(evidence.map((rule) => `${rule.text}\n${rule.citation.quote ?? ""}`).join("\n"), patterns);
}
export async function runModelQuality(model: string, out: string) {
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
  const generations: Array<{ messages: unknown; raw: unknown; wall_ms: number; error?: string }> = [];
  provider.generateJson = async (...args) => {
    const start = performance.now();
    try {
      const raw = await generate(...args);
      generations.push({ messages: args[0], raw, wall_ms: Math.round(performance.now() - start) });
      return raw;
    } catch (error) {
      generations.push({ messages: args[0], raw: null, wall_ms: Math.round(performance.now() - start), error: "generation_failed" });
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
      if (engine.store.listDocuments("company").filter((doc) => doc.status === "active").length === qualityDocuments.length && done.n === 6) { completed = true; break; }
      const failed = engine.store.db.prepare("SELECT COUNT(*) AS n FROM derived_jobs WHERE operation='extraction' AND state='failed'").get() as { n: number };
      if (failed.n > 0) break;
      await new Promise((doneWaiting) => setTimeout(doneWaiting, 100));
    }
    const extractionMs = Math.round(performance.now() - started);
    const rules = engine.store.listRules("company").map((rule) => ({
      source: basename(rule.sourcePath), text: rule.text, scope: rule.applicability, category: rule.category, quotation: rule.quotation,
      citation_exact: qualityDocuments.find((doc) => doc.name === basename(rule.sourcePath) && doc.role === "authoritative")?.text.includes(rule.quotation) ?? false,
    }));
    const results = [];
    for (const scenario of qualityCases) {
      for (const cap of [200, 500]) {
        const began = performance.now();
        const context = await engine.context("company", { query: scenario.query, max_tokens: cap, surface: "code", phase: "turn_start", host: "model-quality-eval" });
        const selected = context.brief.applicable_rules;
        const actualSources = [...new Set(selected.map((rule) => basename(rule.citation.source)))];
        const missingSources = scenario.sources.filter((source) => !actualSources.includes(source));
        const lost = missingEvidencePatterns(selected, scenario.patterns, scenario.sources);
        const budgetValid = context.status.tokenCount === countTokens(context.text, "o200k_base") && context.status.tokenCount <= cap;
        const noOp = scenario.sources.length === 0;
        const conflictValid = scenario.expected_conflicts === undefined || context.status.conflicts === scenario.expected_conflicts;
        results.push({ id: scenario.id, cap, expected_sources: scenario.sources, actual_sources: actualSources,
          missing_sources: missingSources, missing_qualifier_patterns: lost, budget_valid: budgetValid,
          expected_conflicts: scenario.expected_conflicts ?? null, actual_conflicts: context.status.conflicts, conflict_valid: conflictValid,
          correct: completed && budgetValid && conflictValid && (noOp ? selected.length === 0 : missingSources.length === 0 && lost.length === 0),
          retrieval_ms: Math.round(performance.now() - began), brief: context.brief });
      }
    }
    const endTags = await local("/api/tags") as typeof tags;
    const modelUnchanged = endTags.models?.find((item) => item.name === identity.name)?.digest === identity.digest;
    const report = { recorded_at: recordedAt, synthetic_only: true, protocol_version: "quality-v4", completed, model_unchanged: modelUnchanged,
      model: identity, runtime: await local("/api/version"), platform: process.platform, node: process.version, prompt_version: EXTRACTION_PROMPT_VERSION,
      fixture_sha256: createHash("sha256").update(JSON.stringify({ qualityDocuments, qualityCases })).digest("hex"),
      license: { artifact_details: metadata.details ?? null, license_present: !!metadata.license,
        license_sha256: metadata.license ? createHash("sha256").update(metadata.license).digest("hex") : null,
        review: "Artifact redistribution license/notice review pending; this experiment redistributes no model weights." },
      documents: qualityDocuments, cases: qualityCases, generations, rules, extraction_ms: extractionMs,
      all_retained_citations_exact: rules.every((rule) => rule.citation_exact), reference_promoted: rules.some((rule) => rule.source === "vendor-guide.md"),
      results, passed: completed && modelUnchanged && results.every((result) => result.correct) && rules.every((rule) => rule.citation_exact),
      limitations: "Seven small synthetic cases. Regex qualifier checks are lexical diagnostics, not semantic entailment or unsupported-claim proof. Raw generations and retained rules require review. Embeddings and synthesis disabled. Conflicts are explicit-opposition diagnostics only. No statistical generalization or model redistribution license approval.",
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
  void runModelQuality(arg("model") ?? "qwen3.5:4b-mlx", out).then((report) => {
    process.stdout.write(JSON.stringify({ report: join(out, "quality.json"), passed: report.passed, correct: report.results.filter((result) => result.correct).length, total: report.results.length }) + "\n");
    if (!report.passed) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Model quality evaluation failed; inspect preserved generations.\n"); process.exitCode = 1; });
}
