const stopwords = new Set([
  "a", "according", "an", "and", "are", "as", "at", "be", "by", "can", "company", "could", "do", "does", "for", "from", "had", "has", "have", "how", "i", "if", "in", "is", "it", "many", "may", "must", "not", "number", "of", "on", "only", "or", "our", "policy", "return", "should", "that", "the", "their", "them", "there", "these", "this", "those", "to", "was", "were", "what", "when", "where", "which", "who", "why", "will", "with", "would", "you", "your",
  // Quantities and time units alone do not identify a policy subject. A duration
  // in a descriptive task must not retrieve an unrelated operational deadline.
  "second", "seconds", "minute", "minutes", "hour", "hours", "day", "days", "week", "weeks", "month", "months", "year", "years",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred", "thousand",
]);

export function meaningfulTerms(query: string): string[] {
  // The profile already bounds query characters. A prefix term cap can silently
  // discard the task subject after repository/tool instructions in a native prompt.
  return [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((term) => term.length > 2 && !/^\p{N}+$/u.test(term) && !stopwords.has(term)))];
}

export function hasLexicalOverlap(text: string, terms: string[]): boolean {
  if (!terms.length) return false;
  const words = new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  return terms.some((term) => words.has(term));
}
