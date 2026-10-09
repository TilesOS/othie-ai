import type { RuleRecord } from "../types.js";
import { selectRules } from "../rules/selection.js";

export type QualityCandidateMode = "lexical" | "source-revision";

const sourceKey = (rule: RuleRecord) => JSON.stringify([
  rule.profile, rule.documentId, rule.revisionId, rule.sourcePath, rule.authorityPriority,
]);

/** Evaluation-only overfetch: a subject hit may need definitions elsewhere in its
 * original document revision. No filename/label matching, new evidence or inferred
 * semantic links. Unrelated rules in the same source can also be added. */
export function selectQualityCandidates(rules: RuleRecord[], query: string, mode: QualityCandidateMode): RuleRecord[] {
  const lexical = selectRules(rules, query, []);
  if (mode === "lexical") return lexical;
  const included = new Set(lexical);
  const siblings = new Map<string, RuleRecord[]>();
  for (const rule of rules) {
    if (included.has(rule)) continue;
    const key = sourceKey(rule), group = siblings.get(key) ?? [];
    group.push(rule); siblings.set(key, group);
  }
  // Preserve lexical seed ranking. Attach each source's extras once, deterministically,
  // using original evidence rather than IDs containing fresh-engine randomness.
  const result: RuleRecord[] = [];
  for (const rule of lexical) {
    result.push(rule);
    // Global rules alone must not expand a source into unrelated local requirements.
    if (rule.global) continue;
    const key = sourceKey(rule);
    const extra = siblings.get(key) ?? [];
    extra.sort((a, b) => a.location.localeCompare(b.location) || a.quotation.localeCompare(b.quotation)
      || a.text.localeCompare(b.text) || a.id.localeCompare(b.id));
    result.push(...extra); siblings.delete(key);
  }
  return result;
}
