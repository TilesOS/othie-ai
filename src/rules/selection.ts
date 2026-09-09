import type { ChunkRecord, RuleRecord } from "../types.js";

export function selectRules(rules: RuleRecord[], query: string, chunks: ChunkRecord[]): RuleRecord[] {
  const terms = new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((term) => term.length > 2) ?? []);
  return rules.map((rule) => {
    const evidenceRank = chunks.findIndex((chunk) => chunk.revisionId === rule.revisionId && chunk.documentId === rule.documentId && chunk.text.includes(rule.quotation));
    const words = new Set(`${rule.text} ${rule.applicability} ${rule.category}`.toLowerCase().match(/[\p{L}\p{N}]+/gu));
    const lexical = [...terms].filter((term) => words.has(term)).length;
    return { rule, relevant: evidenceRank >= 0 || lexical > 0, score: (evidenceRank >= 0 ? 1 / (1 + evidenceRank) : 0) + lexical / 100 };
  }).filter(({ rule, relevant }) => rule.global || relevant)
    .sort((a, b) => Number(b.rule.global) - Number(a.rule.global) || b.rule.authorityPriority - a.rule.authorityPriority || b.score - a.score || a.rule.id.localeCompare(b.rule.id))
    .map(({ rule }) => rule);
}

function proposition(text: string): { subject: string; action: string; negative: boolean } | undefined {
  const normalized = text.toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();
  const match = /^(.*?)\b(must not|may not|shall not|cannot|can not|must|may|shall|can)\s+(.+)$/.exec(normalized);
  if (!match) return undefined;
  return { subject: match[1]!.trim(), action: match[3]!.trim(), negative: /not|cannot/.test(match[2]!) };
}

/** Deliberately conservative: only explicit opposing modalities for the same scoped action.
 * Different rules in a category are not evidence of a contradiction. Unrecognized differences
 * remain separate rules; this is not a general natural-language contradiction detector.
 */
export function conflictGroups(rules: RuleRecord[]): string[][] {
  const result: string[][] = [];
  for (let a = 0; a < rules.length; a++) for (let b = a + 1; b < rules.length; b++) {
    const left = rules[a]!, right = rules[b]!;
    if (left.category.trim().toLowerCase() !== right.category.trim().toLowerCase() || left.applicability.trim().toLowerCase() !== right.applicability.trim().toLowerCase()) continue;
    const p = proposition(left.text), q = proposition(right.text);
    if (p && q && p.subject === q.subject && p.action === q.action && p.negative !== q.negative) result.push([left.id, right.id]);
  }
  return result;
}
