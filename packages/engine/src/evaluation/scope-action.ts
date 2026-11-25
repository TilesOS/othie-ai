import { meaningfulTerms } from "../retrieval/terms.js";
import { positionRequest, positionSentence } from "./scope-position.js";
import { maskQuotedRequestText } from "./scope-request.js";

const actionCue = /\b(?:obligations?|requirements?|permissions?)\s+(to|for)\s+|\b(?:prohibitions?|bans?)\s+(on|against)\s+/giu;
const subjectCue = /^(?:explain|apply|enforce|implement)\s+/iu;
const ruleVerb = /\b(must\s+not|shall\s+not|may\s+not|must|shall|may|requires?|prohibits?|forbids?|bans?|permits?|allows?)\s+/iu;
const objectEnd = /\s+(?:before|after|if|unless|during|when|at|with|by|using|according\s+to)\s+|[,;.!?]/iu;
const gerund = /ing$/u;

type Action = { verb: string; object: string[] };
type Sentence = { source: string; text: string };

function objectWords(text: string) {
  return meaningfulTerms(text).map((word) => word.replace(/ies$/u, "y").replace(/(ss|ch|sh|x|ns)es$/u, "$1").replace(/(?<![su])s$/u, ""));
}

function actionForms(word: string) {
  const stem = /^(.{2,}?)(ing|ed)$/u.exec(word)?.[1];
  if (!stem) return [word];
  const undoubled = stem.replace(/([^aeiou])\1$/u, "$1");
  return [word, stem, `${stem}e`, undoubled, stem.replace(/i$/u, "y")];
}

function actionParts(text: string) {
  const parts = text.toLowerCase().match(/^([\p{L}-]+)(?:\s+(.*))?$/u);
  return { verb: parts?.[1] ?? "", object: objectWords(parts?.[2] ?? "") };
}

function requestedActions(text: string) {
  const cue = [...text.matchAll(actionCue)].at(-1);
  const main = text.slice(cue ? cue.index + cue[0].length : 0).split(objectEnd, 1)[0]!.trim();
  const parts = main.split(/\s+and\s+/iu);
  if (cue) {
    const actions = parts.map(actionParts);
    const shared = actions.at(-1)?.object ?? [];
    const requests = actions.map(({ verb, object }) => ({ verb, object: object.length ? object : shared }));
    const connector = (cue[1] ?? cue[2])?.toLowerCase();
    if (requests.every(({ verb, object }) => object.length && (connector === "to" || gerund.test(verb)))) {
      return { requests, fallback: connector === "for" ? "object" as const : "none" as const };
    }
    return undefined;
  }
  if (!subjectCue.test(main)) return undefined;
  const requests = parts.map((part) => {
    const phrase = part.replace(subjectCue, "").replace(/\s+(?:exceptions?|requirements?|rules?|obligations?|permissions?)$/iu, "").trim();
    const nominal = /^(.+)\s+(\p{L}+ing)$/iu.exec(phrase);
    return { verb: nominal?.[2]?.toLowerCase() ?? "", object: objectWords(nominal?.[1] ?? "") };
  });
  if (requests.every(({ verb, object }) => verb && object.length)) return { requests, fallback: "position" as const };
}

function assertedAction({ text, source }: Sentence) {
  const assertion = positionSentence(text);
  const marker = ruleVerb.exec(assertion.main);
  if (!marker || !assertion.position) return [];
  const predicate = assertion.main.slice(marker.index + marker[0].length).split(objectEnd, 1)[0]!.trim();
  const nominalVerb = /^(?:requires?|prohibits?|forbids?|bans?|permits?|allows?)\s/iu.test(marker[0]);
  const complement = nominalVerb ? /^.+?\s+to\s+(.+)$/iu.exec(predicate)?.[1] : undefined;
  const passive = /^be\s+(\p{L}+)(?:\s|$)/iu.exec(predicate);
  const argument = passive ? assertion.main.slice(0, marker.index).trim() : complement ?? predicate;
  const action = passive ? { verb: passive[1]!.toLowerCase(), object: objectWords(argument) } : actionParts(argument);
  return [{ ...action, source, text, position: assertion.position, standards: assertion.standards,
    definite: /^the\s/iu.test(argument), nominalObject: nominalVerb && !complement && !gerund.test(action.verb) ? objectWords(predicate) : [] }];
}

function includesPhrase(words: readonly string[], phrase: readonly string[]) {
  return phrase.length > 0 && words.some((_, start) => phrase.every((word, offset) => words[start + offset] === word));
}

/** Evaluation-only admission for requests whose action and object can be parsed.
 * Match within a single predicate and keep the original whole-source evidence.
 */
export function actionAdmission(text: string, sentences: readonly Sentence[]) {
  const request = positionRequest(text);
  const main = positionSentence(maskQuotedRequestText(text)).main;
  const parsed = requestedActions(main);
  if (!parsed) return undefined;

  const assertions = sentences.flatMap(assertedAction);
  const eligible = assertions.filter(({ position, standards }) =>
    (!request.positions.length || request.positions.includes(position)) &&
    (!request.standards.length || standards.some((standard) => request.standards.includes(standard))));
  const bindings = parsed.requests.map(({ verb, object }) => {
    const forms = actionForms(verb);
    const actionMatches = ({ verb: asserted }: Action) => actionForms(asserted).some((form) => forms.includes(form));
    const matches = eligible.filter((assertion) => {
      if (forms.includes("use") && object.every((word, index) => assertion.nominalObject[index] === word)) return true;
      if (!actionMatches(assertion)) return false;
      if (includesPhrase(assertion.object, object)) return true;
      // A definite short object can refer back to a full object in an earlier
      // assertion of the same action in that source.
      if (!assertion.definite || assertion.object.length !== 1) return false;
      const antecedent = assertions.slice(0, assertions.indexOf(assertion)).reverse().find((earlier) =>
        earlier.source === assertion.source && actionMatches(earlier) && earlier.object.length > 1 && earlier.object.at(-1) === assertion.object[0]);
      return Boolean(antecedent && includesPhrase(antecedent.object, object));
    });
    const objectMatches = parsed.fallback === "object" && !matches.length
      ? eligible.filter((assertion) => includesPhrase(assertion.object, object)) : [];
    return { verb, object, matched_by: objectMatches.length ? "object" : "action-and-object",
      assertions: [...matches, ...objectMatches].map(({ source, text }) => ({ source, text })) };
  });
  if (parsed.fallback === "position" && bindings.some((binding) => !binding.assertions.length)) return undefined;
  return { bindings, admitted: [...new Set(bindings.flatMap((binding) => binding.assertions.map(({ source }) => source)))] };
}
