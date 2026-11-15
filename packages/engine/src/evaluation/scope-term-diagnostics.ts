interface ScopeDocument { name: string; text: string }

const wordsIn = (text: string) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

/** Descriptive overlap only: a matching sentence does not establish applicability.
 * Keep disclaimers, exceptions and negative rules verbatim for review. Neither
 * expected source labels nor generated rule labels participate in this trace.
 */
export function scopeTermMatches(terms: readonly string[], documents: readonly ScopeDocument[]) {
  const unique = [...new Set(terms)];
  return documents.flatMap((document) => {
    const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(document.text)]
      .map(({ segment }, index) => {
        const text = segment.trim(), words = wordsIn(text);
        return { index, text, terms: unique.filter((term) => words.has(term)) };
      }).filter((sentence) => sentence.terms.length > 0);
    return sentences.length ? [{ source: document.name, sentences }] : [];
  });
}

/** Single-term sufficiency and leave-one-term-out probes, not a new strategy.
 * Probe only terms present in fixture text: the remaining terms cannot create
 * lexical matches in these provider-disabled stores. Preserve their original
 * order in leave-one-out queries, including long-query prefixes.
 */
export function scopeTermInterventions(terms: readonly string[], documents: readonly ScopeDocument[]) {
  const unique = [...new Set(terms)];
  const vocabulary = new Set(documents.flatMap((document) => [...wordsIn(document.text)]));
  return unique.filter((term) => vocabulary.has(term)).flatMap((term) => [
    { kind: "only-term" as const, term, terms: [term] },
    { kind: "without-term" as const, term, terms: unique.filter((item) => item !== term) },
  ]);
}
