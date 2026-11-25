import { meaningfulTerms } from "../retrieval/terms.js";
import { isScopeDisclaimer, scopeAssertions } from "./assertion-subject.js";
import { positionOverlap, positionRequest, positionSentence } from "./scope-position.js";
import { maskQuotedRequestText, requestIntents } from "./scope-request.js";
import { scopeTermMatches } from "./scope-term-diagnostics.js";

type Document = { name: string; text: string };

const descriptive = /^(?:the|this|our)\s+(?:[\p{L}-]+\s+){0,4}(?:index|report|table|directory|list)\s+(?:lists?|mentions?|contains?|shows?)\b/iu;
const possibleRule = /\b(?:must|shall|may|should)\b|(?:[;:]|\b(?:and|but|yet)\b)\s+(?:(?:it|they)\s+)?(?:requires?|prohibits?|permits?|forbids?|allows?)\b/iu;
const compareBoth = /\bboth\s+(?:company\s+)?(?:standards|policies|rules)\b/iu;

function phraseTokens(text: string) {
  return meaningfulTerms(text).map((word) => word.replace(/ies$/u, "y").replace(/(ss|x)es$/u, "$1").replace(/(?<![su])s$/u, ""));
}

function coordinateSubjects(text: string) {
  const masked = maskQuotedRequestText(text);
  const object = /\bfor\s+(?=\S)/iu.exec(masked);
  const start = object ? object.index + object[0].length : 0;
  const conjunctions = [...masked.slice(start).matchAll(/\s+and\s+/giu)];
  const subjects = [];
  let previous = start;
  for (const conjunction of conjunctions) {
    const index = start + conjunction.index;
    subjects.push(text.slice(previous, index).trim());
    previous = index + conjunction[0].length;
  }
  subjects.push(text.slice(previous).trim());
  // Try the shared head of a two-part coordinate object, e.g. "press and
  // contractor passes". Require sentence evidence for the resulting phrase.
  if (object && subjects.length === 2 && /^\p{L}+$/u.test(subjects[0]!)) {
    const words = subjects[1]!.match(/[\p{L}\p{N}]+/gu);
    if (words?.length === 2) subjects[0] += ` ${words[1]}`;
  }
  return subjects;
}

type SentenceMatch = { source: string; terms: string[]; words: string[]; text: string };

function matchSubject(text: string, sentences: readonly SentenceMatch[], retainComparison: boolean) {
  const words = phraseTokens(text);
  const queryTerms = new Set(meaningfulTerms(text));
  const scores = new Map<string, { terms: Set<string>; span: string[] }>();
  for (const sentence of sentences) {
    const score = scores.get(sentence.source) ?? { terms: new Set<string>(), span: [] };
    scores.set(sentence.source, score);
    for (const term of sentence.terms) if (queryTerms.has(term)) score.terms.add(term);
    for (let start = 0; start < words.length; start++) {
      for (let sourceStart = 0; sourceStart < sentence.words.length; sourceStart++) {
        let size = 0;
        while (start + size < words.length && words[start + size] === sentence.words[sourceStart + size]) size++;
        if (size > score.span.length) score.span = words.slice(start, start + size);
      }
    }
  }
  const longest = Math.max(0, ...[...scores.values()].map(({ span }) => span.length));
  const mostTerms = Math.max(0, ...[...scores.values()].map(({ terms }) => terms.size));
  const minimumSpan = retainComparison ? Math.max(2, longest - 1) : longest;
  const selected = [...scores].filter(([, { terms, span }]) => longest >= 2
    ? span.length >= minimumSpan : terms.size > 0 && terms.size === mostTerms);
  const anchors = selected.flatMap(([, { terms, span }]) => longest >= 2 ? [span.join(" ")] : [...terms]);
  return { text, anchors: [...new Set(anchors)], admitted: selected.map(([source]) => source) };
}

function matchPosition(text: string, request: ReturnType<typeof positionRequest>, coordinated: boolean,
  sentences: readonly SentenceMatch[], comparison: boolean) {
  const words = phraseTokens(positionSentence(text).main);
  const assertions = sentences.map((sentence) => {
    const assertion = positionSentence(sentence.text);
    return { ...assertion, source: sentence.source, overlap: positionOverlap(words, phraseTokens(assertion.main)) };
  });
  const baseline = matchSubject(text, sentences, comparison);
  const positions = coordinated && request.positions.length < 2 ? positionRequest(text).positions : request.positions;
  const named = assertions.filter(({ standards }) => standards.some((name) => request.standards.includes(name)));
  const positioned = assertions.filter(({ position, overlap }) => position && positions.includes(position) && overlap >= 2);
  if (request.standards.length && named.length) {
    const topical = named.filter(({ overlap }) => overlap >= 2);
    return { ...baseline, admitted: [...new Set((topical.length ? topical : named).map(({ source }) => source))], selection: "named-standard" };
  }
  if (!comparison && positioned.length) {
    return { ...baseline, admitted: [...new Set(positioned.map(({ source }) => source))], selection: "position" };
  }
  const primary = new Set(assertions.filter(({ overlap }) => overlap > 0).map(({ source }) => source));
  const conditionOnly = new Set(assertions.filter(({ condition, source }) => condition && !primary.has(source)).map(({ source }) => source));
  const retained = baseline.admitted.filter((source) => !conditionOnly.has(source));
  if (retained.some((source) => primary.has(source)) && retained.length < baseline.admitted.length) {
    return { ...baseline, admitted: retained, selection: "primary-assertion" };
  }
  return { ...baseline, selection: "subject" };
}

/** Evaluation-only admission using clause subjects and sentence alignment.
 * Original evidence is packed by the same downstream evaluator as prior arms.
 */
export function subjectAdmission(query: string, documents: readonly Document[], positionAware = false) {
  const clauses = requestIntents(query, true).map((clause) => {
    const matches = scopeTermMatches(clause.terms, documents);
    const descriptiveMatches: { source: string; text: string }[] = [];
    const sentences = matches.flatMap(({ source, sentences }) => sentences.flatMap(({ text, terms }) => {
      if (isScopeDisclaimer(text)) return [];
      if (descriptive.test(text) && !possibleRule.test(text)) {
        descriptiveMatches.push({ source, text });
        return [];
      }
      return [{ source, terms, words: phraseTokens(text), text }];
    }));
    const required = new Set(phraseTokens(clause.required.join(" ")));
    const focused = new Set(sentences.filter(({ words }) => words.some((word) => required.has(word))).map(({ source }) => source));
    const eligible = focused.size ? sentences.filter(({ source }) => focused.has(source)) : sentences;
    const position = positionAware ? positionRequest(clause.text) : undefined;
    const comparison = compareBoth.test(clause.text) || Boolean(position?.compare_all);
    const parts = clause.decision === "request" && !position?.descriptive_request ? coordinateSubjects(clause.text) : [];
    const subjects = parts.map((text) => position
      ? matchPosition(text, position, parts.length > 1, eligible, comparison)
      : matchSubject(text, eligible, comparison));
    const bound = subjects.flatMap(({ admitted }) => admitted);
    const admitted = position?.descriptive_request ? [] : [...new Set(bound.length ? bound : eligible.map(({ source }) => source))];
    return { ...clause, subjects, descriptive_matches: descriptiveMatches, admitted, ...(position ? { position_request: position } : {}) };
  });
  const terms = [...new Set(clauses.flatMap((clause) => clause.terms))];
  return { clauses, terms, assertions: scopeAssertions(terms, documents), admitted: [...new Set(clauses.flatMap((clause) => clause.admitted))] };
}
