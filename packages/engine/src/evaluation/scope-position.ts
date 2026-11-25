import { maskQuotedRequestText } from "./scope-request.js";

const standardQualifier = "current|legacy|previous|prior|new|updated|revised|pilot|interim|draft";
const standardName = new RegExp(`\\b((?:${standardQualifier})(?:\\s+and\\s+(?:${standardQualifier}))*)\\s+(?:[\\p{L}-]+\\s+){0,2}?standards?\\b`, "giu");
const obligation = /\b(?:obligations?|requirements?)\b/iu;
const prohibition = /\b(?:prohibitions?|bans?)\b/iu;
const permission = /\b(?:permissions?)\b/iu;
const allStandards = /\bcompare\b.*\ball\s+(?:[\p{L}-]+\s+){0,2}standards\b/iu;
const directoryEntry = /\b(?:entr(?:y|ies)|labels?)\b.*\b(?:from|in)\s+.*\b(?:index|directory|table|list)\b|\b(?:index|directory|table|list)['’]s\b.*\bentr(?:y|ies)\b/iu;
const directoryMention = /^(?:the|this|our)\s+(?:[\p{L}-]+\s+){0,4}(?:index|directory|table|list)\s+(?:lists?|mentions?|contains?|shows?)\b/iu;
const leadingCondition = /^(?:if|unless|during|when)\s+[^,]+,\s*/iu;
const trailingCondition = /\s+(?:if|unless|during|when|provided\s+that|only\s+after)\s+/iu;
const positioningVerb = /\b(?:must\s+not|shall\s+not|may\s+not|must|shall|requires?|obliges?|prohibits?|forbids?|bans?|may|permits?|allows?)\b/iu;
const scaffoldWords = new Set(["apply", "compare", "enforce", "explain", "implement", "require", "requirement", "rule", "standard", "prohibition", "permission", "obligation"]);

type Position = "obligation" | "prohibition" | "permission";

function standardNames(text: string) {
  return [...text.matchAll(standardName)].flatMap((match) => match[1]!.toLowerCase().split(/\s+and\s+/u));
}

function sourcePosition(text: string): Position | undefined {
  const verb = positioningVerb.exec(text)?.[0].toLowerCase();
  if (!verb) return undefined;
  if (/\bnot$|^(?:prohibit|forbid|ban)/u.test(verb)) return "prohibition";
  if (/^(?:may|permit|allow)/u.test(verb)) return "permission";
  return "obligation";
}

export function positionRequest(text: string) {
  const unquoted = maskQuotedRequestText(text);
  const positions: Position[] = [];
  if (obligation.test(unquoted)) positions.push("obligation");
  if (prohibition.test(unquoted)) positions.push("prohibition");
  if (permission.test(unquoted)) positions.push("permission");
  return {
    standards: standardNames(unquoted),
    positions,
    compare_all: allStandards.test(unquoted),
    descriptive_request: directoryEntry.test(unquoted) || (directoryMention.test(unquoted) && !positioningVerb.test(unquoted)),
  };
}

export function positionSentence(text: string) {
  const main = text.replace(leadingCondition, "").split(trailingCondition, 1)[0]!;
  return { main, condition: main !== text, standards: standardNames(main), position: sourcePosition(main) };
}

// Count distinct shared words in one assertion so a standard name or modal
// in a different sentence cannot settle which position a source takes.
export function positionOverlap(subject: readonly string[], assertion: readonly string[]) {
  const terms = new Set(subject.filter((word) => !scaffoldWords.has(word)));
  return new Set(assertion.filter((word) => terms.has(word))).size;
}
