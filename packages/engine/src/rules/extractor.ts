import { z } from "zod";
import type { OthieConfig, OthieProfile } from "../config.js";
import { sha256 } from "../ingestion/chunker.js";
import { isQualificationSentence } from "../ingestion/sentences.js";
import type { ProviderRegistry } from "../providers/registry.js";
import type { ChunkRecord, RuleRecord } from "../types.js";
import { CLASSIFICATION_PROMPT, classificationJsonSchema, validateSentenceClassification, type SentenceClassification } from "./classification.js";

export const EXTRACTION_PROMPT_VERSION = "rules-v11";

const extractedSchema = z.object({
  rules: z.array(z.object({
    category: z.string().min(1).max(100),
    applicability: z.string().min(1).max(1_000),
    source_id: z.string().min(1),
    first_sentence: z.number().int().min(1),
    last_sentence: z.number().int().min(1),
  }).strict()).max(100),
}).strict();

const completeSchema = extractedSchema.extend({
  non_policy_sentences: z.array(z.object({
    source_id: z.string().min(1),
    sentence: z.number().int().min(1),
    reason: z.enum(["descriptive", "model_instruction"]),
  }).strict()).max(100),
}).strict();

function sourceSentences(source: ChunkRecord) {
  const bodyOffset = source.text.startsWith(`${source.heading}\n`) ? source.heading.length + 1 : 0;
  return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(source.text.slice(bodyOffset))]
    .filter(({ segment }) => segment.trim())
    .map(({ segment, index }) => ({ text: segment.trim(), start: bodyOffset + index, end: bodyOffset + index + segment.length }));
}

function selectedSpan(source: ChunkRecord, firstSentence: number, lastSentence: number, kinds?: Map<string, SentenceClassification["kind"]>) {
  if (lastSentence < firstSentence) return undefined;
  const sentences = sourceSentences(source);
  let firstIndex = firstSentence - 1, lastIndex = lastSentence - 1;
  if (!sentences[firstIndex] || !sentences[lastIndex]) return undefined;
  // A selection cannot detach syntactically marked follow-up qualifications.
  // Other relationships still require explicit evidence links and semantic evaluation.
  const policy = (index: number) => !kinds || kinds.get(`${source.id}:${index + 1}`) === "policy";
  while (firstIndex > 0 && policy(firstIndex - 1) && isQualificationSentence(sentences[firstIndex]!.text)) firstIndex--;
  while (sentences[lastIndex + 1] && policy(lastIndex + 1) && isQualificationSentence(sentences[lastIndex + 1]!.text)) lastIndex++;
  const quotation = source.text.slice(sentences[firstIndex]!.start, sentences[lastIndex]!.end).trim();
  if (quotation.length > 2_000) return undefined;
  return { firstIndex, lastIndex, quotation };
}

/** Require an explicit disposition for every sentence before publishing model work. */
export function validateCompleteExtraction(raw: unknown, chunks: ChunkRecord[], global: boolean, modelIdentity: string, classifications?: SentenceClassification[]): RuleRecord[] {
  const parsed = completeSchema.parse(raw);
  const sources = new Map(chunks.filter((chunk) => chunk.sourceRole === "authoritative").map((chunk) => [chunk.id, chunk]));
  const coverage = new Map([...sources].map(([id, source]) => [id, Array<boolean>(sourceSentences(source).length).fill(false)]));
  const kinds = classifications && new Map(classifications.map((sentence) => [`${sentence.source_id}:${sentence.sentence}`, sentence.kind]));
  for (const rule of parsed.rules) {
    const source = sources.get(rule.source_id);
    const span = source && selectedSpan(source, rule.first_sentence, rule.last_sentence, kinds);
    if (!span) throw new Error("Invalid extraction policy selection");
    const selected = coverage.get(rule.source_id)!;
    for (let index = span.firstIndex; index <= span.lastIndex; index++) {
      if (kinds && kinds.get(`${rule.source_id}:${index + 1}`) !== "policy") throw new Error("Policy selection contradicts sentence classification");
      selected[index] = true;
    }
  }
  for (const excluded of parsed.non_policy_sentences) {
    const selected = coverage.get(excluded.source_id);
    const index = excluded.sentence - 1;
    if (!selected || index >= selected.length || selected[index]) throw new Error("Invalid or conflicting extraction sentence disposition");
    if (kinds && kinds.get(`${excluded.source_id}:${excluded.sentence}`) !== excluded.reason) throw new Error("Non-policy disposition contradicts sentence classification");
    selected[index] = true;
  }
  if ([...coverage.values()].some((sentences) => sentences.includes(false))) throw new Error("Incomplete extraction sentence coverage");
  return validateExtractedRules({ rules: parsed.rules }, chunks, global, modelIdentity, classifications);
}

export function validateExtractedRules(raw: unknown, chunks: ChunkRecord[], global: boolean, modelIdentity: string, classifications?: SentenceClassification[]): RuleRecord[] {
  const parsed = extractedSchema.parse(raw);
  const sourceMap = new Map(chunks.filter((chunk) => chunk.sourceRole === "authoritative").map((chunk) => [chunk.id, chunk]));
  const kinds = classifications && new Map(classifications.map((sentence) => [`${sentence.source_id}:${sentence.sentence}`, sentence.kind]));
  const rules = parsed.rules.flatMap((rule): RuleRecord[] => {
    const source = sourceMap.get(rule.source_id);
    const span = source && selectedSpan(source, rule.first_sentence, rule.last_sentence, kinds);
    if (!source || !span) return [];
    // Recover the contiguous original span, including intervening whitespace. The
    // model selects evidence; it cannot rewrite rule text or its quotation.
    const { quotation } = span;
    return [{ id: sha256(`${source.revisionId}:${quotation}:${quotation}`), profile: source.profile,
      documentId: source.documentId, revisionId: source.revisionId, sourcePath: source.sourcePath,
      text: quotation, category: rule.category, applicability: rule.applicability, quotation,
      location: source.location, authorityPriority: source.authorityPriority, global, modelIdentity,
      promptVersion: EXTRACTION_PROMPT_VERSION }];
  });
  return [...new Map(rules.map((rule) => [rule.id, rule])).values()];
}

/** Derive complete evidence from classifications without a second model selection. */
export function rulesFromClassifications(chunks: ChunkRecord[], classified: unknown, global: boolean, modelIdentity: string): RuleRecord[] {
  const sources = chunks.filter((chunk) => chunk.sourceRole === "authoritative");
  const numbered = sources.map((source) => ({ source_id: source.id,
    sentences: sourceSentences(source).map((sentence, index) => ({ number: index + 1, text: sentence.text })) }));
  const validated = validateSentenceClassification(classified, numbered);
  const decisions = new Map(validated.map((sentence) => [`${sentence.source_id}:${sentence.sentence}`, sentence]));
  const classifications = numbered.flatMap((source) => source.sentences.map((sentence) => decisions.get(`${source.source_id}:${sentence.number}`)!));
  // Select every policy sentence. Span recovery joins syntactic qualifications,
  // deduplicates identical evidence, and cannot cross classified exclusions.
  // Fixed metadata makes no generated claim about scope or subject.
  const rules = classifications.filter((sentence) => sentence.kind === "policy").map((sentence) => ({
    category: "policy", applicability: "See cited evidence.", source_id: sentence.source_id,
    first_sentence: sentence.sentence, last_sentence: sentence.sentence,
  }));
  const non_policy_sentences = classifications.filter((sentence) => sentence.kind !== "policy").map((sentence) => ({
    source_id: sentence.source_id, sentence: sentence.sentence, reason: sentence.kind,
  }));
  return validateCompleteExtraction({ rules, non_policy_sentences }, sources, global, modelIdentity, classifications);
}

export async function extractRules(input: {
  chunks: ChunkRecord[]; profile: OthieProfile; config: OthieConfig; providers: ProviderRegistry; global: boolean; signal?: AbortSignal;
}): Promise<RuleRecord[]> {
  // Invocation-local aliases avoid asking the model to reproduce a long hash.
  // The complete original source metadata remains attached to each alias.
  const authoritative = input.chunks.filter((chunk) => chunk.sourceRole === "authoritative")
    .map((chunk, index) => ({ ...chunk, id: `s${index + 1}` }));
  if (!authoritative.length) return [];
  const model = input.config.models.compiler;
  const provider = input.providers.require(input.profile, "extraction", model.provider);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(2_000, model.synthesis_deadline_ms * 5));
  try {
    const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal;
    signal.throwIfAborted();
    const sources = authoritative.map((chunk) => ({ source_id: chunk.id,
      sentences: sourceSentences(chunk).map((sentence, index) => ({ number: index + 1, text: sentence.text })) }));
    const classified = await provider.generateJson([
      { role: "system", content: CLASSIFICATION_PROMPT },
      { role: "user", content: JSON.stringify({ sources }) },
    ], model.model, classificationJsonSchema(sources), signal, { thinking: model.thinking });
    signal.throwIfAborted();
    return rulesFromClassifications(authoritative, classified, input.global, `${model.provider}:${model.model}:${model.revision}`);
  } finally { clearTimeout(timeout); }
}
