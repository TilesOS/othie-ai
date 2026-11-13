import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { configSchema } from "../config.js";
import { OthieEngine } from "../engine/service.js";
import { meaningfulTerms } from "../retrieval/terms.js";
import { EXTRACTION_PROMPT_VERSION } from "../rules/extractor.js";
import { countTokens } from "../tokenizer.js";
import type { ChunkRecord, ContextResult, RuleRecord } from "../types.js";
import { evaluationArguments } from "./arguments.js";
import { applicabilityQualityCases } from "./quality-cases.js";
import { queryScopeScores } from "./query-scope-metrics.js";
import { queryScopeCases, queryScopeDocuments, type QueryScopeCase } from "./query-scope-cases.js";
import { policyGuardCases } from "./policy-guard-cases.js";
import { localBindingCases, localBindingCounterexamples } from "./local-bindings-cases.js";
import { localBindingTerms } from "./local-bindings.js";
import { clauseBindingCases, clauseBindingCounterexamples } from "./clause-bindings-cases.js";
import { clauseBindingTerms } from "./clause-bindings.js";
import { qualifiedBindingCases, qualifiedBindingCounterexamples } from "./qualified-bindings-cases.js";
import { qualifiedBindingTerms } from "./qualified-bindings.js";
import { scopeTransferCases, scopeTransferDocuments } from "./scope-transfer-cases.js";

export const queryScopeStrategies = ["lexical", "drop-request", "mask-call-arguments"] as const;
export const policyGuardStrategies = [...queryScopeStrategies, "policy-guarded-arguments"] as const;
export const localBindingStrategies = [...policyGuardStrategies, "local-bindings"] as const;
export const clauseBindingStrategies = [...localBindingStrategies, "clause-bindings"] as const;
export const qualifiedBindingStrategies = [...clauseBindingStrategies, "qualified-bindings"] as const;
export type QueryScopeStrategy = typeof qualifiedBindingStrategies[number];

/** Shadow interventions only. None is used by production retrieval. */
export function queryScopeTerms(query: string, strategy: QueryScopeStrategy): string[] {
  if (strategy === "qualified-bindings") return qualifiedBindingTerms(query);
  if (strategy === "clause-bindings") return clauseBindingTerms(query);
  if (strategy === "local-bindings") return localBindingTerms(query);
  if (strategy === "policy-guarded-arguments") {
    // Hypothesis, not an intent classifier: explicit policy vocabulary protects
    // argument subjects. Incidental/quoted/negated cues and implicit requests are
    // deliberately scored in the extension rather than silently assumed safe.
    const policyCue = /\b(?:polic(?:y|ies)|requirements?|company\s+defaults)\b/i.test(query);
    return queryScopeTerms(query, policyCue ? "lexical" : "mask-call-arguments");
  }
  if (strategy === "mask-call-arguments") {
    // Deliberately narrow: simple identifier lists, not a language parser. Keep
    // function names, quoted prose and terms repeated outside the argument list.
    const identifier = "[$_\\p{L}][$_\\p{L}\\p{N}]*";
    query = query.replace(new RegExp(`(${identifier}\\s*\\()\\s*${identifier}(?:\\s*,\\s*${identifier})*\\s*\\)`, "gu"), "$1)");
  }
  const terms = meaningfulTerms(query);
  return strategy === "drop-request" ? terms.filter((term) => term !== "request") : terms;
}

export function scoreQueryScope(scenario: QueryScopeCase, evidence: readonly { source: string; quote: string }[],
  documents: readonly { name: string; text: string }[] = queryScopeDocuments) {
  const actual = [...new Set(evidence.map((item) => basename(item.source)))].sort();
  const missingSources = scenario.sources.filter((source) => !actual.includes(source));
  // Require every original sentence, including exceptions/negation. A filename
  // hit or an isolated number cannot stand in for complete policy evidence.
  const missingSentences = scenario.sources.flatMap((source) => {
    const document = documents.find((item) => item.name === source);
    if (!document) throw new Error("Unknown scope fixture source");
    const quotes = evidence.filter((item) => basename(item.source) === source).map((item) => item.quote);
    return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(document.text)]
      .map(({ segment }) => segment.trim()).filter((sentence) => !quotes.some((quote) => quote.includes(sentence)))
      .map((sentence) => ({ source, sentence }));
  });
  const additionalSources = actual.filter((source) => !scenario.sources.includes(source));
  const correct = scenario.sources.length === 0 ? evidence.length === 0 : missingSources.length === 0 && missingSentences.length === 0;
  return { actual_sources: actual, missing_sources: missingSources, missing_sentences: missingSentences,
    additional_sources: additionalSources, correct, precise_correct: correct && additionalSources.length === 0 };
}

export function queryScopeOptions(argv: string[]) {
  const args = evaluationArguments(argv, ["out", "repeats", "corpus"], "query scope");
  const out = args.get("out");
  const repeats = Number(args.get("repeats") ?? "2");
  if (!out || !Number.isInteger(repeats) || repeats < 1 || repeats > 5) throw new Error("query scope requires --out and --repeats between 1 and 5");
  const corpus = args.get("corpus") ?? "original";
  if (corpus !== "original" && corpus !== "policy-guard" && corpus !== "local-bindings" && corpus !== "clause-bindings" && corpus !== "qualified-bindings" && corpus !== "scope-transfer") throw new Error("query scope corpus must be original, policy-guard, local-bindings, clause-bindings, qualified-bindings or scope-transfer");
  return { out: resolve(out), repeats, corpus };
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const evidenceFrom = (result: ContextResult) => [
  ...result.brief.applicable_rules.map((rule) => ({ source: rule.citation.source, quote: rule.citation.quote ?? "" })),
  ...result.brief.permitted_excerpts.map((excerpt) => ({ source: excerpt.citation.source, quote: excerpt.text })),
];
type ScopeResult = ReturnType<typeof scoreQueryScope> & {
  id: string; family: string; expected_sources: readonly string[]; repeat: number;
  mode: "excerpts" | "rules_only"; strategy: QueryScopeStrategy; terms: string[]; query: string;
  citations_exact: boolean; cap_passed: boolean; component_wall_ms: number; text: string;
  evidence: ReturnType<typeof evidenceFrom>;
};

export async function runQueryScope(options: ReturnType<typeof queryScopeOptions>) {
  const transfer = options.corpus === "scope-transfer";
  const documents = transfer ? scopeTransferDocuments : queryScopeDocuments;
  const cases = transfer ? scopeTransferCases : options.corpus === "qualified-bindings" ? qualifiedBindingCases : options.corpus === "clause-bindings" ? clauseBindingCases : options.corpus === "local-bindings" ? localBindingCases : options.corpus === "policy-guard" ? policyGuardCases : queryScopeCases;
  const strategies = transfer ? qualifiedBindingStrategies : options.corpus === "qualified-bindings" ? qualifiedBindingStrategies : options.corpus === "clause-bindings" ? clauseBindingStrategies : options.corpus === "local-bindings" ? localBindingStrategies : options.corpus === "policy-guard" ? policyGuardStrategies : queryScopeStrategies;
  await mkdir(options.out, { recursive: false, mode: 0o700 });
  const save = (name: string, data: unknown) => writeFile(join(options.out, name), JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  const artifactNames = ["query-scope.js", "query-scope-metrics.js", "query-scope-cases.js", "policy-guard-cases.js", "../retrieval/terms.js", "../storage/manifest.js", "../retrieval/hybrid.js", "../rules/selection.js", "../context/compiler.js", "../context/packing.js"];
  if (options.corpus === "local-bindings" || options.corpus === "clause-bindings" || options.corpus === "qualified-bindings" || transfer) artifactNames.push("local-bindings.js", "local-bindings-cases.js");
  if (options.corpus === "clause-bindings" || options.corpus === "qualified-bindings" || transfer) artifactNames.push("clause-bindings.js", "clause-bindings-cases.js");
  if (options.corpus === "qualified-bindings" || transfer) artifactNames.push("qualified-bindings.js", "qualified-bindings-cases.js");
  if (transfer) artifactNames.push("scope-transfer-cases.js");
  const artifacts = Object.fromEntries(await Promise.all(artifactNames.map(async (name) => [name, hash(await readFile(new URL(name, import.meta.url), "utf8"))])));
  await save("protocol.json", { protocol: "query-scope-shadow-v3", corpus: options.corpus, recorded_at: new Date().toISOString(),
    synthetic_only: true, node: process.version, platform: process.platform, repeats: options.repeats,
    strategies, documents, cases,
    original_case_ids: queryScopeCases.map(({ id }) => id),
    fixture_sha256: hash(JSON.stringify({ documents, cases })), artifacts,
    scoring: { historical_correct: "Complete expected sentences; no-op requires no evidence; exact citations and token cap.",
      precise_correct: "Historical correct plus no additional source basenames.",
      positive_exact: "Positive tasks with precise_correct / all positive tasks; empty positive retrieval fails.",
      positive_source_precision: "Expected source memberships / all retrieved source memberships on positive tasks; each source counted once per task. Raw counts, no 0/0 ratio.",
      acceptance: "Per mode/strategy: all positive recall, positive exact, no-op, citation and token gates must pass; empty subsets are not accepted. CLI requires every row precise_correct." },
    limitations: "Evaluation-only query interventions. Providers disabled. Fresh seeded SQLite/Lance stores per repeat/export mode; not ingestion, model extraction, semantic acceptance, native-host or adapter latency. Excerpts use reference chunks; rules-only uses manually supplied whole-document authoritative rules to isolate scope from extraction/grouping. Positive recall requires every expected sentence. Precision measures fixture source membership, not semantic relevance within an expected document. Case order reverses and strategy order rotates on fresh repeats." });
  const root = await realpath(await mkdtemp(join(tmpdir(), "othie-query-scope-")));
  const results: ScopeResult[] = [];
  try {
    for (let repeat = 0; repeat < options.repeats; repeat++) for (const mode of ["excerpts", "rules_only"] as const) {
      const data = join(root, `${repeat}-${mode}`), docs = join(data, "docs");
      await mkdir(docs, { recursive: true });
      const config = configSchema.parse({ version: 1, data_dir: data, ingestion: { watch_enabled: false },
        profiles: { company: { sources: [{ root: docs, role: mode === "excerpts" ? "reference" : "authoritative", authority_priority: 80, retrieval_weight: 1, global_rule_documents: [] }],
          permitted_exports: mode === "excerpts" ? "rules_and_excerpts" : "rules_only", providers: { embeddings: [], extraction: [], synthesis: [] },
          token_budget: { enabled: true, max_tokens: 500, tokenizer: "o200k_base" }, safeguards: { max_query_chars: 100_000 } } } });
      const engine = new OthieEngine(config, data);
      try {
        const chunks: ChunkRecord[] = [];
        for (const document of documents) {
          const id = document.name, revision = `${id}-revision`, sourcePath = join(docs, id), contentHash = hash(document.text);
          const role = mode === "excerpts" ? "reference" : "authoritative";
          engine.store.beginReplacement({ documentId: id, revisionId: revision, path: sourcePath, profile: "company", role, authority: 80, weight: 1,
            contentHash, parserVersion: "scope-fixture", chunkerVersion: "scope-fixture", mtimeMs: 1, size: Buffer.byteLength(document.text) });
          const chunk: ChunkRecord = { id: `${id}-chunk`, documentId: id, revisionId: revision, profile: "company", sourcePath, sourceRole: role,
            authorityPriority: 80, retrievalWeight: 1, heading: "", location: "lines 1-1", text: document.text, contentHash, tokenCount: countTokens(document.text, "o200k_base") };
          engine.store.publishReplacement(id, revision, contentHash, [chunk]); chunks.push(chunk);
          if (mode === "rules_only") {
            const model = config.models.compiler;
            const rule: RuleRecord = { id: `${id}-rule`, documentId: id, revisionId: revision, profile: "company", sourcePath,
              text: document.text, quotation: document.text, location: "lines 1-1", authorityPriority: 80, global: false,
              category: "fixture", applicability: "fixture", modelIdentity: `${model.provider}:${model.model}:${model.revision}`, promptVersion: EXTRACTION_PROMPT_VERSION };
            engine.store.replaceRules(id, revision, [rule]);
          }
        }
        await engine.lance.addText(chunks);
        const orderedCases = repeat % 2 ? [...cases].reverse() : cases;
        for (const scenario of orderedCases) for (let offset = 0; offset < strategies.length; offset++) {
          const strategy = strategies[(offset + repeat) % strategies.length]!;
          const start = performance.now();
          const terms = queryScopeTerms(scenario.query, strategy);
          // An all-removed query still exercises the compiler's empty-term path.
          const query = strategy === "lexical" ? scenario.query : terms.join(" ") || "?";
          const response = await engine.context("company", { query, max_tokens: 500, surface: "code", phase: "turn_start" });
          const evidence = evidenceFrom(response);
          const score = scoreQueryScope(scenario, evidence, documents);
          const citationsExact = evidence.every((item) => item.quote.trim().length > 0 && documents.find((document) => document.name === basename(item.source))?.text.includes(item.quote));
          const capPassed = response.status.tokenCount === countTokens(response.text, "o200k_base") && response.status.tokenCount <= 500;
          results.push({ id: scenario.id, family: scenario.family, expected_sources: scenario.sources, repeat, mode, strategy, terms, query,
            ...score, correct: score.correct && citationsExact && capPassed, precise_correct: score.precise_correct && citationsExact && capPassed,
            citations_exact: citationsExact, cap_passed: capPassed,
            component_wall_ms: Math.round((performance.now() - start) * 100) / 100, text: response.text, evidence });
        }
      } finally { await engine.stop(); }
    }
    const scoresFor = (subset: readonly ScopeResult[]) => ["excerpts", "rules_only"].flatMap((mode) => strategies.map((strategy) => {
      const rows = subset.filter((item) => item.mode === mode && item.strategy === strategy);
      return { mode, strategy, ...queryScopeScores(rows) };
    }));
    const scores = scoresFor(results);
    const originalIds = new Set(queryScopeCases.map(({ id }) => id));
    const subsets = transfer ? { transfer: scoresFor(results) } : { original: scoresFor(results.filter((item) => originalIds.has(item.id))),
      counterexamples: scoresFor(results.filter((item) => !originalIds.has(item.id))) };
    const guardIds = new Set(policyGuardCases.filter(({ id }) => !originalIds.has(id)).map(({ id }) => id));
    const bindingIds = new Set(localBindingCounterexamples.map(({ id }) => id));
    const extensionSubsets = options.corpus === "local-bindings" || options.corpus === "clause-bindings" || options.corpus === "qualified-bindings" ? {
      policy_guard: scoresFor(results.filter((item) => guardIds.has(item.id))),
      local_bindings: scoresFor(results.filter((item) => bindingIds.has(item.id))),
    } : {};
    const clauseIds = new Set(clauseBindingCounterexamples.map(({ id }) => id));
    const clauseSubset = options.corpus === "clause-bindings" || options.corpus === "qualified-bindings" ? { clause_bindings: scoresFor(results.filter((item) => clauseIds.has(item.id))) } : {};
    const qualifiedIds = new Set(qualifiedBindingCounterexamples.map(({ id }) => id));
    const qualifiedSubset = options.corpus === "qualified-bindings" ? { qualified_bindings: scoresFor(results.filter((item) => qualifiedIds.has(item.id))) } : {};
    const unchanged = strategies.map((strategy) => ({ strategy, total: applicabilityQualityCases.length,
      unchanged: applicabilityQualityCases.filter((scenario) => JSON.stringify(queryScopeTerms(scenario.query, strategy)) === JSON.stringify(meaningfulTerms(scenario.query))).length }));
    await save("results.json", results);
    const summary = { completed: true, results: "results.json", scores, subsets, ...extensionSubsets, ...clauseSubset, ...qualifiedSubset, previous_applicability_query_terms: unchanged,
      all_correct: results.every((item) => item.correct), all_precise_correct: results.every((item) => item.precise_correct), rows: results.length };
    await save("summary.json", summary);
    return summary;
  } catch (error) {
    await save("failure.json", { completed: false, stage: "seed-or-evaluate" });
    throw error;
  } finally { await rm(root, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = queryScopeOptions(process.argv.slice(2));
  void runQueryScope(options).then((report) => {
    process.stdout.write(JSON.stringify(report) + "\n");
    if (!report.all_precise_correct) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Query scope evaluation failed; inspect preserved evidence.\n"); process.exitCode = 1; });
}
