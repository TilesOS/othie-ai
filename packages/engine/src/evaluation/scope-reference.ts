import { meaningfulTerms } from "../retrieval/terms.js";
import { assertionSubjectTerms, scopeAssertions } from "./assertion-subject.js";

const identifier = "[$_\\p{L}][$_\\p{L}\\p{N}]*";
const companySource = "(?:the\\s+)?company\\s+(?:polic(?:y|ies)|documents)";
const reference = new RegExp(
  `^(?:do\\s+not|don['’]t|never|avoid)\\s+(?:(?:just|only|merely)\\s+)?(?:sort|deduplicate)\\s+` +
  `(\x60?)${identifier}\\s*\\(\\s*(${identifier})\\s*\\)\\1\\s*[.;]\\s*` +
  `(?:(?:keep|preserve)\\s+(?:the\\s+)?(?:(?:existing|public|current)\\s+)?(?:api|interface|signature)\\.\\s*)?` +
  `((?:apply|implement)\\s+([^.?!;]+?)\\s+(?:according\\s+to|under|following)\\s+${companySource})(?=[.!?;]|$)`, "iu");
const localDescriptor = /\b(?:comparator|indentation|formatting|alphabetical\s+ordering|index\s+arithmetic)\b/iu;
const localPlot = /^plot\b[^.!?;]*\b(?:from|using)\b[^.!?;]*\blocal\b[^.!?;]*(?:\bcsv\b|\bdata\b)/iu;
const fileDescription = /^(?:the\s+)?(?:test|fixture)\s+file\s+is\s+named\s+[^.!?;]+[.!?]\s*/iu;
const malformedLocalCall = new RegExp(`^((?:sort|deduplicate)\\s+[^\\n.!?;()]*?)${identifier}\\s*\\([^\\n.!?;()]*$`, "iu");
const negatedLookup = new RegExp(`\\bwithout\\s+(?:consulting|following|using)\\s+(?:the\\s+)?company\\s+(?:${identifier}\\s+)?polic(?:y|ies)\\b`, "giu");
const explicitScope = new RegExp(`^([^.!?;"'\x60]*?)\\busing\\s+(?:the\\s+)?company\\s+(${identifier}(?:\\s+${identifier}){0,3})\\s+policy\\s*(?=[.!?;]|$)`, "iu");

/** Probe a deliberately narrow reference pattern: one initial, negated local
 * call with a single argument, up to one interface-preservation instruction,
 * then an affirmative qualified replacement. No fixture labels are consulted.
 */
export function referenceTerms(query: string) {
  const match = reference.exec(query);
  const carried = match && !localDescriptor.test(match[4]!) ? meaningfulTerms(match[2]!) : [];
  const rewritten = (match ? match[3]! + query.slice(match[0].length) : query)
    .replace(fileDescription, "")
    .replace(malformedLocalCall, (original, prefix: string) => /\bcompany\b/iu.test(original) ? original : prefix)
    .replace(negatedLookup, " ");
  const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(rewritten)];
  const terms = assertionSubjectTerms(sentences.map(({ segment }) =>
    localPlot.test(segment.trim()) && !/\b(?:company|policy|policies)\b/iu.test(segment) ? ". " : segment).join(""));
  return { terms: [...new Set([...carried, ...terms])], carried, replacement: match?.[4] ?? null };
}

function explicitFocus(query: string): string[] {
  const match = explicitScope.exec(query);
  if (!match || /\b(?:without|never|not)\b/iu.test(match[1]!) || /\b(?:also|separately|additionally)\b/iu.test(query.slice(match[0].length))) return [];
  return meaningfulTerms(match[2]!);
}

export function referenceAdmission(query: string, documents: readonly { name: string; text: string }[], focus: boolean) {
  const trace = referenceTerms(query);
  const assertions = scopeAssertions(trace.terms, documents);
  const matched = assertions.filter(({ asserted_terms }) => asserted_terms.length);
  const focusTerms = focus ? explicitFocus(query) : [];
  const focused = matched.filter(({ asserted_terms }) => focusTerms.some((term) => asserted_terms.includes(term)));
  // A one-term overlap can be incidental when another source corroborates the
  // same term with additional query evidence. Keep ties and distinct overlaps.
  const admitted = focused.length ? focused : matched.filter(({ asserted_terms }) =>
    !focus || asserted_terms.length > 1 || !matched.some((other) => other.asserted_terms.length > 1 && other.asserted_terms.includes(asserted_terms[0]!)));
  return { ...trace, assertions, focus_terms: focusTerms, admitted: admitted.map(({ source }) => source) };
}
