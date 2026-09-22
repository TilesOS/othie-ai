const stopwords = new Set([
  "a", "according", "an", "and", "are", "as", "at", "be", "by", "can", "company", "could", "do", "does", "for", "from", "had", "has", "have", "how", "i", "if", "in", "is", "it", "many", "may", "must", "number", "of", "on", "only", "or", "our", "policy", "return", "should", "that", "the", "their", "them", "there", "these", "this", "those", "to", "was", "were", "what", "when", "where", "which", "who", "why", "will", "with", "would", "you", "your",
]);

export function meaningfulTerms(query: string): string[] {
  return [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((term) => term.length > 2 && !stopwords.has(term)))].slice(0, 20);
}

export function hasLexicalOverlap(text: string, terms: string[]): boolean {
  if (!terms.length) return false;
  const words = new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  return terms.some((term) => words.has(term));
}
