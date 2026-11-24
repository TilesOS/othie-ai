import { meaningfulTerms } from "../retrieval/terms.js";
import { scopeAssertions } from "./assertion-subject.js";
import { referenceAdmission } from "./scope-reference.js";

const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });
const quotedSpan = /"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|“[^”]*”|‘[^’]*’|(?<![\p{L}\p{N}])'(?:\\.|[^'\\])*'/gu;
const clauseBoundary = /[;\n]+|(?:,\s*|\s+)(?:and|but|then)\s+(?=(?:(?:also|separately)\s+)?(?:apply|implement|enforce|use|print|render|show|sort|deduplicate|do\s+not)\b)/giu;
const localOnly = /\b(?:only|solely)\s+(?:from\s+)?(?:the\s+)?(?:local|hard-coded|test)\b|\b(?:using|from)\s+(?:the\s+)?local\b/iu;
const sourceDenial = /\b(?:(?:do\s+not|don['’]t|never)\s+(?:consult|follow|use)|without\s+(?:consulting|following|using))\s+(?:the\s+)?company\b/iu;
const mentions = /^(?:the\s+)?(?:local\s+)?(?:stub|fixture|test file)\b[^.!?]*\b(?:mentions?|contains?|is named|lists?)\b/iu;
const literalOutput = /^(?:print|render|display|show|put|write)\b[^.!?]*\b(?:literal\s+(?:text|string)|(?:the\s+)?(?:message|label|string)\s+(?=["'`“‘]))/iu;
const defer = /^(?:ask|clarify|confirm)\b[^.!?]*\b(?:which|whether)\b[^.!?]*\bbefore\b/iu;
const localOperation = /^(?:(?:do\s+not|don['’]t|never|avoid)\s+)?(?:(?:just|only|merely)\s+)?(?:sort|deduplicate)\b/iu;
const negatedOperation = /^(?:do\s+not|don['’]t|never|avoid)\b/iu;
const policyCue = /\b(?:company|polic(?:y|ies)|requirements?|standards?)\b/iu;
const interfacePreservation = /^(?:keep|preserve)\s+(?:the\s+)?(?:(?:existing|public|current)\s+)?(?:api|interface|signature)\b/iu;
const call = /[$_\p{L}][$_\p{L}\p{N}]*\s*\(\s*([$_\p{L}][$_\p{L}\p{N}]*)\s*\)/gu;
const switchCall = /^switch\s+to\b/iu;
const replacement = /^(?:apply|implement|enforce)\b.+\b(?:under|following|according\s+to)\s+(?:the\s+)?company\b/iu;
const localDescriptor = /\b(?:comparator|indentation|formatting|alphabetical\s+ordering|index\s+arithmetic)\b/iu;
const ordinalCall = /\b(first|second|third|last)\s+call['’]s\b/iu;
const ordinals = ["first", "second", "third"];
const implicitReplacement = /^(?:apply|implement|enforce)\s+(?:the\s+)?(?:[\p{L}-]+\s+)?(?:eligibility|exceptions?)\b/iu;
const quotedOutput = /^(?:print|render|display|show|put|write)\s+(?:["'`“‘]|the\s+(?:label|message|string)\b)/iu;
const localFixtureCount = /\bonly\s+(?:the\s+)?(?:two|three|\d+)\s+(?:hard-coded|local|test)\b/iu;

// Keep offsets stable so separators inside quoted data do not split requests.
export function maskQuotedRequestText(text: string) {
  return text.replace(quotedSpan, (span) => span.replace(/\S/g, "x"));
}

function requestClauses(query: string) {
  const masked = maskQuotedRequestText(query);
  return [...sentenceSegmenter.segment(masked)].flatMap(({ segment, index }) => {
    const clauses: string[] = [];
    let start = 0;
    for (const boundary of segment.matchAll(clauseBoundary)) {
      clauses.push(query.slice(index + start, index + boundary.index));
      start = boundary.index + boundary[0].length;
    }
    clauses.push(query.slice(index + start, index + segment.length));
    return clauses.map((clause) => clause.trim()).filter(Boolean);
  });
}

type Decision = "request" | "local" | "denied" | "literal" | "mention" | "deferred" | "unresolved";
type Document = { name: string; text: string };

export function requestIntents(query: string, bindImplicit = false) {
  let antecedents: string[] = [];
  return requestClauses(query).map((text) => {
    const calls = [...text.matchAll(call)].map((match) => match[1]!);
    const record = (decision: Decision, terms: string[] = [], required: string[] = []) => ({ text, decision, terms, required });
    if (interfacePreservation.test(text)) return record("local");
    const previousCalls = antecedents;
    antecedents = [];
    if (defer.test(text)) return record("deferred");
    if (literalOutput.test(text) || (bindImplicit && quotedOutput.test(text))) return record("literal");
    if (mentions.test(text)) return record("mention");
    if (sourceDenial.test(text)) return record("denied");
    if (localOnly.test(text) || (bindImplicit && localFixtureCount.test(text))) return record("local");
    if (switchCall.test(text) || (localOperation.test(text) && !policyCue.test(text))) {
      if (switchCall.test(text) || negatedOperation.test(text)) antecedents = calls;
      return record("local");
    }
    const trace = referenceAdmission(text, [], true);
    const implicit = bindImplicit && previousCalls.length > 0 && implicitReplacement.test(text);
    if (!replacement.test(text) && !implicit) {
      if (bindImplicit && previousCalls.length && localDescriptor.test(text)) return record("local");
      return record("request", trace.terms, trace.focus_terms);
    }
    const ordinal = ordinalCall.exec(text)?.[1]?.toLowerCase();
    const pronoun = /\bits\b/iu.test(text);
    const index = ordinal === "last" ? previousCalls.length - 1 : ordinals.indexOf(ordinal ?? "");
    const selected = ordinal ? previousCalls[index] : previousCalls.length === 1 ? previousCalls[0] : undefined;
    if (localDescriptor.test(text)) return record("local");
    if ((ordinal || pronoun || implicit) && !selected) return record("unresolved");
    const required = selected ? meaningfulTerms(selected) : [];
    return record("request", [...new Set([...required, ...trace.terms])], required.length ? required : trace.focus_terms);
  });
}

/** Compare independent clause admission with a lexical specificity filter.
 * The latter removes only strict subsets of another source's clause overlap.
 * Equal overlaps can still express conflicting requirements.
 */
export function requestAdmission(query: string, documents: readonly Document[], specific: boolean) {
  const clauses = requestIntents(query).map((clause) => {
    if (!clause.terms.length) return { ...clause, admitted: [] };
    const matches = scopeAssertions(clause.terms, documents).filter(({ asserted_terms }) => asserted_terms.length);
    const focused = matches.filter(({ asserted_terms }) => clause.required.some((term) => asserted_terms.includes(term)));
    const available = focused.length ? focused : matches;
    const admitted = available.filter(({ asserted_terms }, index) => !available.some((other, otherIndex) =>
      index !== otherIndex && (specific || (!focused.length && asserted_terms.length === 1)) && other.asserted_terms.length > asserted_terms.length
      && asserted_terms.every((term) => other.asserted_terms.includes(term))));
    return { ...clause, admitted: admitted.map(({ source }) => source) };
  });
  const terms = [...new Set(clauses.flatMap((clause) => clause.terms))];
  return { clauses, terms, assertions: scopeAssertions(terms, documents), admitted: [...new Set(clauses.flatMap((clause) => clause.admitted))] };
}
