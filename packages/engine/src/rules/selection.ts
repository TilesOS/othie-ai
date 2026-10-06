import type { ChunkRecord, RuleRecord } from "../types.js";
import { meaningfulTerms } from "../retrieval/terms.js";

export function selectRules(rules: RuleRecord[], query: string, semanticChunks: ChunkRecord[]): RuleRecord[] {
  const terms = new Set(meaningfulTerms(query));
  const evidence = rules.map((rule) => ({ rule, words: new Set(`${rule.text} ${rule.quotation}`.toLowerCase().match(/[\p{L}\p{N}]+/gu)) }));
  const frequency = new Map([...terms].map((term) => [term, evidence.filter(({ words }) => words.has(term)).length]));
  const ranked = evidence.map(({ rule, words }) => {
    // Only semantic hits can select evidence without matching its own words. A
    // keyword hit elsewhere in a mixed source must not promote unrelated rules.
    const evidenceRank = semanticChunks.findIndex((chunk) => chunk.revisionId === rule.revisionId && chunk.documentId === rule.documentId && chunk.text.includes(rule.quotation));
    // Generated labels cannot establish lexical relevance. Weight evidence hits
    // by corpus rarity and length so common policy vocabulary in a long rule
    // does not displace a short requirement about the requested subject.
    const matched = [...terms].filter((term) => words.has(term));
    const lexical = matched.reduce((score, term) => score + Math.log(1 + rules.length / frequency.get(term)!), 0) / Math.sqrt(words.size || 1);
    return { rule, relevant: evidenceRank >= 0 || matched.length > 0, score: (evidenceRank >= 0 ? 1 / (1 + evidenceRank) : 0) + lexical / 100 };
  }).filter(({ rule, relevant }) => rule.global || relevant);
  // Keep independently relevant evidence from the best-matching original source
  // together. This preserves citation grouping and avoids a generic overlapping
  // rule displacing a second requirement from that source during whole-item packing.
  const group = (rule: RuleRecord) => JSON.stringify([rule.profile, rule.documentId, rule.revisionId, rule.sourcePath, rule.location, rule.authorityPriority]);
  const scores = new Map<string, number>();
  for (const { rule, score } of ranked) scores.set(group(rule), Math.max(score, scores.get(group(rule)) ?? 0));
  return ranked.sort((a, b) => Number(b.rule.global) - Number(a.rule.global) || b.rule.authorityPriority - a.rule.authorityPriority
    || scores.get(group(b.rule))! - scores.get(group(a.rule))! || group(a.rule).localeCompare(group(b.rule))
    || b.score - a.score || a.rule.id.localeCompare(b.rule.id)).map(({ rule }) => rule);
}

function proposition(text: string): { subject: string; action: string; negative: boolean } | undefined {
  const normalized = text.toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();
  const match = /^(.*?)\b(must not|may not|shall not|cannot|can not|must|may|shall|can)\s+(.+)$/.exec(normalized);
  if (!match) return undefined;
  return { subject: match[1]!.trim(), action: match[3]!.trim(), negative: /not|cannot/.test(match[2]!) };
}

function opposed(left: string, right: string): boolean {
  const p = proposition(left), q = proposition(right);
  return !!(p && q && p.subject && p.subject === q.subject && p.action === q.action && p.negative !== q.negative);
}

/** Deliberately conservative: only explicit opposing modalities for the same scoped action.
 * Different rules in a category are not evidence of a contradiction. Unrecognized differences
 * remain separate rules; this is not a general natural-language contradiction detector.
 */
export function conflictGroups(rules: RuleRecord[]): string[][] {
  const result: string[][] = [];
  for (let a = 0; a < rules.length; a++) for (let b = a + 1; b < rules.length; b++) {
    const left = rules[a]!, right = rules[b]!;
    // Exact evidence carries its own scope. Generated category/applicability labels
    // must not hide opposition between otherwise identical supporting statements.
    const evidenceOpposed = opposed(left.quotation, right.quotation);
    const labelsMatch = left.category.trim().toLowerCase() === right.category.trim().toLowerCase()
      && left.applicability.trim().toLowerCase() === right.applicability.trim().toLowerCase();
    if (evidenceOpposed || (labelsMatch && opposed(left.text, right.text))) result.push([left.id, right.id]);
  }
  return result;
}
