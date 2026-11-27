import { meaningfulTerms } from "../retrieval/terms.js";
import { positionRequest, positionSentence } from "./scope-position.js";
import { maskQuotedRequestText } from "./scope-request.js";

const actionCue = /\b(?:obligations?|requirements?|permissions?)\s+(to|for)\s+|\b(?:prohibitions?|bans?)\s+(on|against)\s+/giu;
const subjectCue = /^(?:explain|apply|enforce|implement)\s+/iu;
const ruleVerb = /\b(must\s+not|shall\s+not|may\s+not|must|shall|may|requires?|prohibits?|forbids?|bans?|permits?|allows?)\s+/iu;
const objectEnd = /\s+(?:before|after|if|unless|during|when|at|with|by|using|according\s+to)\s+|[,;.!?]/iu;
const gerund = /ing$/u;
const conditionMarker = /\b(only\s+after|provided\s+that|before|after|if|unless|during|when)\s+/giu;
const leadingTrigger = new RegExp("^" + conditionMarker.source + "[^,]+,\\s*", "iu");
const coordinationVerbs = new Set([
  "archive", "check", "clean", "close", "collect", "confirm", "copy", "discard", "display", "document",
  "inspect", "label", "lock", "log", "notify", "open", "print", "record", "release", "remove", "replace",
  "report", "retain", "review", "seal", "send", "stamp", "store", "submit", "unlock", "verify", "wash",
]);
const verbAliases = [["document", "log", "record"], ["check", "verify"]];

type Action = { verb: string; object: string[] };
type Sentence = { source: string; text: string };
type Trigger = { marker: string; terms: string[] };

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

function governedActions(argument: string): Action[] {
  const [first, ...rest] = argument.split(/\s+and\s+/iu);
  const phrases = [first!];
  // Keep a conjunct in the object phrase unless it starts with a recognized verb.
  for (const part of rest) {
    if (actionForms(actionParts(part).verb).some((form) => coordinationVerbs.has(form))) phrases.push(part);
    else phrases[phrases.length - 1] += " and " + part;
  }
  const actions = phrases.map(actionParts);
  const shared = actions.at(-1)!.object;
  return actions.map(({ verb, object }) => ({ verb, object: object.length ? object : shared }));
}

function triggers(text: string): Trigger[] {
  const markers = [...text.matchAll(conditionMarker)];
  return markers.flatMap((match, index) => {
    const textEnd = markers[index + 1]?.index;
    const phrase = text.slice(match.index + match[0].length, textEnd).split(/[,;.!?]/u, 1)[0]!;
    const terms = phrase.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((word) => !/^(?:a|an|the)$/u.test(word)) ?? [];
    return terms.length ? [{ marker: match[1]!.toLowerCase().replace(/\s+/gu, " "), terms }] : [];
  });
}

function sameTrigger(left: Trigger, right: Trigger) {
  return left.marker === right.marker && left.terms.length === right.terms.length
    && left.terms.every((term, index) => term === right.terms[index]);
}

function assertedAction({ text, source }: Sentence, predicates: boolean) {
  const assertion = positionSentence(predicates ? text.replace(leadingTrigger, "") : text);
  const marker = ruleVerb.exec(assertion.main);
  const { position, standards } = assertion;
  if (!marker || !position) return [];
  const predicate = assertion.main.slice(marker.index + marker[0].length).split(objectEnd, 1)[0]!.trim();
  const nominalVerb = /^(?:requires?|prohibits?|forbids?|bans?|permits?|allows?)\s/iu.test(marker[0]);
  const complement = nominalVerb ? /^.+?\s+to\s+(.+)$/iu.exec(predicate)?.[1] : undefined;
  const passive = /^be\s+(\p{L}+)(?:\s|$)/iu.exec(predicate);
  const argument = passive ? assertion.main.slice(0, marker.index).trim() : complement ?? predicate;
  const actions = passive ? [{ verb: passive[1]!.toLowerCase(), object: objectWords(argument) }]
    : predicates ? governedActions(argument) : [actionParts(argument)];
  return actions.map((action) => ({ ...action, source, text, position, standards,
    triggers: predicates ? triggers(text) : [],
    definite: /^the\s/iu.test(argument), nominalObject: nominalVerb && !complement && !gerund.test(action.verb) ? objectWords(predicate) : [] }));
}

function includesPhrase(words: readonly string[], phrase: readonly string[]) {
  return phrase.length > 0 && words.some((_, start) => phrase.every((word, offset) => words[start + offset] === word));
}

/** Evaluation-only admission for requests whose action and object can be parsed.
 * Match within a single predicate and keep the original whole-source evidence.
 */
export function actionAdmission(text: string, sentences: readonly Sentence[], predicates = false) {
  const request = positionRequest(text);
  const unquoted = maskQuotedRequestText(text);
  const main = positionSentence(predicates ? unquoted.replace(leadingTrigger, "") : unquoted).main;
  const parsed = requestedActions(main);
  if (!parsed) return undefined;

  const requestedTriggers = predicates ? triggers(unquoted) : [];
  const assertions = sentences.flatMap((sentence) => assertedAction(sentence, predicates));
  const eligible = assertions.filter(({ position, standards }) =>
    (!request.positions.length || request.positions.includes(position)) &&
    (!request.standards.length || standards.some((standard) => request.standards.includes(standard))));
  const bindings = parsed.requests.map(({ verb, object }) => {
    const forms = actionForms(verb);
    const actionMatches = ({ verb: asserted }: Action) => actionForms(asserted).some((form) => forms.includes(form));
    const aliases = predicates ? verbAliases.find((group) => group.some((form) => forms.includes(form))) : undefined;
    const aliasMatches = ({ verb: asserted }: Action) => actionForms(asserted).some((form) => aliases?.includes(form));
    const bind = (matchesVerb: (action: Action) => boolean) => eligible.filter((assertion) => {
      if (forms.includes("use") && object.every((word, index) => assertion.nominalObject[index] === word)) return true;
      if (!matchesVerb(assertion)) return false;
      if (includesPhrase(assertion.object, object)) return true;
      // A definite short object can refer back to a full object in an earlier
      // assertion of the same action in that source.
      if (!assertion.definite || assertion.object.length !== 1) return false;
      const antecedent = assertions.slice(0, assertions.indexOf(assertion)).reverse().find((earlier) =>
        earlier.source === assertion.source && matchesVerb(earlier) && earlier.object.length > 1 && earlier.object.at(-1) === assertion.object[0]);
      return Boolean(antecedent && includesPhrase(antecedent.object, object));
    });
    const matches = bind(actionMatches);
    const paraphraseMatches = aliases && !matches.length ? bind(aliasMatches) : [];
    const objectMatches = parsed.fallback === "object" && !matches.length && !paraphraseMatches.length
      ? eligible.filter((assertion) => includesPhrase(assertion.object, object)) : [];
    const bound = [...matches, ...paraphraseMatches, ...objectMatches];
    const triggered = requestedTriggers.length ? bound.filter((assertion) => requestedTriggers.every((requested) =>
      assertion.triggers.some((trigger) => sameTrigger(trigger, requested)))) : [];
    const competing = new Set(bound.map(({ source }) => source)).size > 1;
    // A lone candidate remains visible when its trigger wording cannot be confirmed.
    const selected = triggered.length || (requestedTriggers.length && competing) ? triggered : bound;
    return { verb, object, matched_by: objectMatches.length ? "object" : paraphraseMatches.length ? "verb-alias-and-object" : "action-and-object",
      assertions: selected.map(({ source, text }) => ({ source, text })),
      ...(requestedTriggers.length ? { requested_triggers: requestedTriggers,
        trigger_selection: triggered.length ? "matched" : competing ? "unmatched-competing" : "unconfirmed" } : {}) };
  });
  if (parsed.fallback === "position" && bindings.some((binding) => !binding.assertions.length)) return undefined;
  return { bindings, admitted: [...new Set(bindings.flatMap((binding) => binding.assertions.map(({ source }) => source)))] };
}
