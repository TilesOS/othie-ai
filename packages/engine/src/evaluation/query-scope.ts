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
import { diagnosticScores } from "./quality-metrics.js";
import { queryScopeCases, queryScopeDocuments, type QueryScopeCase } from "./query-scope-cases.js";

export const queryScopeStrategies = ["lexical", "drop-request", "mask-call-arguments"] as const;
export type QueryScopeStrategy = typeof queryScopeStrategies[number];

/** Shadow interventions only. Neither is used by production retrieval. */
export function queryScopeTerms(query: string, strategy: QueryScopeStrategy): string[] {
  if (strategy === "mask-call-arguments") {
    // Deliberately narrow: simple identifier lists, not a language parser. Keep
    // function names, quoted prose and terms repeated outside the argument list.
    const identifier = "[$_\\p{L}][$_\\p{L}\\p{N}]*";
    query = query.replace(new RegExp(`(${identifier}\\s*\\()\\s*${identifier}(?:\\s*,\\s*${identifier})*\\s*\\)`, "gu"), "$1)");
  }
  const terms = meaningfulTerms(query);
  return strategy === "drop-request" ? terms.filter((term) => term !== "request") : terms;
}

export function scoreQueryScope(scenario: QueryScopeCase, evidence: readonly { source: string; quote: string }[]) {
  const actual = [...new Set(evidence.map((item) => basename(item.source)))].sort();
  const missingSources = scenario.sources.filter((source) => !actual.includes(source));
  // Require every original sentence, including exceptions/negation. A filename
  // hit or an isolated number cannot stand in for complete policy evidence.
  const missingSentences = scenario.sources.flatMap((source) => {
    const document = queryScopeDocuments.find((item) => item.name === source);
    if (!document) throw new Error("Unknown scope fixture source");
    const quotes = evidence.filter((item) => basename(item.source) === source).map((item) => item.quote);
    return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(document.text)]
      .map(({ segment }) => segment.trim()).filter((sentence) => !quotes.some((quote) => quote.includes(sentence)))
      .map((sentence) => ({ source, sentence }));
  });
  return { actual_sources: actual, missing_sources: missingSources, missing_sentences: missingSentences,
    additional_sources: actual.filter((source) => !scenario.sources.includes(source)),
    correct: scenario.sources.length === 0 ? evidence.length === 0 : missingSources.length === 0 && missingSentences.length === 0 };
}

export function queryScopeOptions(argv: string[]) {
  const args = evaluationArguments(argv, ["out", "repeats"], "query scope");
  const out = args.get("out");
  const repeats = Number(args.get("repeats") ?? "2");
  if (!out || !Number.isInteger(repeats) || repeats < 1 || repeats > 5) throw new Error("query scope requires --out and --repeats between 1 and 5");
  return { out: resolve(out), repeats };
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
  await mkdir(options.out, { recursive: false, mode: 0o700 });
  const save = (name: string, data: unknown) => writeFile(join(options.out, name), JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  const artifactNames = ["query-scope.js", "query-scope-cases.js", "../retrieval/terms.js", "../storage/manifest.js", "../retrieval/hybrid.js", "../rules/selection.js", "../context/compiler.js", "../context/packing.js"];
  const artifacts = Object.fromEntries(await Promise.all(artifactNames.map(async (name) => [name, hash(await readFile(new URL(name, import.meta.url), "utf8"))])));
  await save("protocol.json", { protocol: "query-scope-shadow-v1", recorded_at: new Date().toISOString(),
    synthetic_only: true, node: process.version, platform: process.platform, repeats: options.repeats,
    strategies: queryScopeStrategies, documents: queryScopeDocuments, cases: queryScopeCases,
    fixture_sha256: hash(JSON.stringify({ documents: queryScopeDocuments, cases: queryScopeCases })), artifacts,
    limitations: "Evaluation-only query interventions. Providers disabled. Fresh seeded SQLite/Lance stores per repeat/export mode; not ingestion, model extraction, semantic acceptance, native-host or adapter latency. Excerpts use reference chunks; rules-only uses manually supplied whole-document authoritative rules to isolate scope from extraction/grouping. Positive recall requires every expected sentence; extra sources are reported separately. Case order reverses and strategy order rotates on fresh repeats." });
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
        for (const document of queryScopeDocuments) {
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
        const cases = repeat % 2 ? [...queryScopeCases].reverse() : queryScopeCases;
        for (const scenario of cases) for (let offset = 0; offset < queryScopeStrategies.length; offset++) {
          const strategy = queryScopeStrategies[(offset + repeat) % queryScopeStrategies.length]!;
          const start = performance.now();
          const terms = queryScopeTerms(scenario.query, strategy);
          // An all-removed query still exercises the compiler's empty-term path.
          const query = strategy === "lexical" ? scenario.query : terms.join(" ") || "?";
          const response = await engine.context("company", { query, max_tokens: 500, surface: "code", phase: "turn_start" });
          const evidence = evidenceFrom(response);
          const score = scoreQueryScope(scenario, evidence);
          const citationsExact = evidence.every((item) => item.quote.trim().length > 0 && queryScopeDocuments.find((document) => document.name === basename(item.source))?.text.includes(item.quote));
          const capPassed = response.status.tokenCount === countTokens(response.text, "o200k_base") && response.status.tokenCount <= 500;
          results.push({ id: scenario.id, family: scenario.family, expected_sources: scenario.sources, repeat, mode, strategy, terms, query,
            ...score, correct: score.correct && citationsExact && capPassed, citations_exact: citationsExact, cap_passed: capPassed,
            component_wall_ms: Math.round((performance.now() - start) * 100) / 100, text: response.text, evidence });
        }
      } finally { await engine.stop(); }
    }
    const scores = ["excerpts", "rules_only"].flatMap((mode) => queryScopeStrategies.map((strategy) => {
      const rows = results.filter((item) => item.mode === mode && item.strategy === strategy);
      return { mode, strategy, ...diagnosticScores(rows), citations_exact: rows.every((row) => row.citations_exact), caps_passed: rows.every((row) => row.cap_passed) };
    }));
    const unchanged = queryScopeStrategies.map((strategy) => ({ strategy, total: applicabilityQualityCases.length,
      unchanged: applicabilityQualityCases.filter((scenario) => JSON.stringify(queryScopeTerms(scenario.query, strategy)) === JSON.stringify(meaningfulTerms(scenario.query))).length }));
    await save("results.json", results);
    const summary = { completed: true, results: "results.json", scores, previous_applicability_query_terms: unchanged,
      all_correct: results.every((item) => item.correct), rows: results.length };
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
    if (!report.all_correct) process.exitCode = 1;
  }).catch(() => { process.stderr.write("Query scope evaluation failed; inspect preserved evidence.\n"); process.exitCode = 1; });
}
