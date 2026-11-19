import { meaningfulTerms } from "../retrieval/terms.js";
import { qualifiedBindingTerms } from "./qualified-bindings.js";
import { scopeTermMatches } from "./scope-term-diagnostics.js";

// Only a document explicitly disclaiming coverage counts here. An actor
// prohibiting an action, a document prohibiting an action, and a mixed sentence
// containing another assertion can all carry applicable evidence.
const disclaimer = /^(?:this|these|the)\s+(?:[\p{L}-]+\s+){0,3}(?:document|reference|guide|manual|handbook|policy|documents|references|guides|manuals|handbooks|policies)\s+(?:does\s+not|do\s+not)\s+(?:define|set|cover|specify|address|govern)\b/iu;
const mixedAssertion = /[;:]|\b(?:but|yet|however|although|whereas|instead|except|unless)\b|,\s+and\b|\band\s+(?:it|they|requires?|permits?|defines?|specifies?)\b/iu;

export function isScopeDisclaimer(sentence: string): boolean {
  return disclaimer.test(sentence) && !mixedAssertion.test(sentence);
}

/** Evaluation-only source admission. Keep the original evidence for every
 * admitted source, including its scope statements and all qualifications.
 */
export function scopeAssertions(terms: readonly string[], documents: readonly { name: string; text: string }[]) {
  return scopeTermMatches(terms, documents).map(({ source, sentences }) => {
    const asserted = new Set<string>(), disclaimed = new Set<string>();
    for (const sentence of sentences) {
      const destination = isScopeDisclaimer(sentence.text) ? disclaimed : asserted;
      for (const term of sentence.terms) destination.add(term);
    }
    return { source, asserted_terms: [...asserted], disclaimer_terms: [...disclaimed] };
  });
}

const bareDefaults = /^(?:all|any|apply|company|compare|current|describe|document|explain|global|implement|list|organization|organisational|organizational|outline|our|review|show|summarize|summarise|the|use)$/iu;

/** Preserve the existing binder's local code/literal handling and modify
 * explicit sentence patterns. This heuristic has no antecedent resolver.
 */
export function assertionSubjectTerms(query: string): string[] {
  const bound = qualifiedBindingTerms(query.replace(/,\s+as\s+required\s+by(?=\s+(?:the\s+)?company\b)/giu, ", according to"));
  const subjects = query
    .replace(/\buse\s+(?:the\s+)?company\s+(?:policy|policies|documents)\s+to\b/giu, " ")
    .replace(/\bthrough(?=\s+`?[$_\p{L}][$_\p{L}\p{N}]*\s*\()/giu, " ")
    .replace(/\b(?:company\s+)?defaults\s+for(?=\s+[`"'\p{L}])/giu, " ")
    .replace(/\b([\p{L}][\p{L}\p{N}_-]*)\s+defaults\b/giu, (phrase, modifier: string) =>
      bareDefaults.test(modifier) ? phrase : modifier);
  // Keep a term that also occurs as a subject in another part of the query.
  const remaining = new Set(meaningfulTerms(subjects));
  return bound.filter((term) => remaining.has(term));
}
