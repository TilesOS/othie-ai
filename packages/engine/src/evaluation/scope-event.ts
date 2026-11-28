const marker = /\b(only\s+after|provided\s+that|before|after|if|unless|during|when)\s+/giu;
const conjunction = /,\s*(?:and\s+)?|\s+and\s+/giu;
const leading = new RegExp("^" + marker.source + "[^,]+,\\s*", "iu");
const positive = /^(?:if|when|provided that)$/u;
const time = /^(?:before|after|during|only after)$/u;
const eventNouns: ReadonlyMap<string, string> = new Map([
  ["calibration", "calibrate"], ["inspection", "inspect"], ["replacement", "replace"],
]);
const eventWords: ReadonlyMap<string, string> = new Map([
  ["check", "inspection"], ["cleanup", "cleaning"],
]);
const irregular: ReadonlyMap<string, string> = new Map([
  ["built", "build"], ["cut", "cut"], ["hung", "hang"], ["kept", "keep"],
  ["laid", "lay"], ["left", "leave"], ["made", "make"], ["read", "read"],
  ["sent", "send"], ["set", "set"], ["written", "write"],
]);

export type EventTrigger = { marker: string; terms: string[] };

export function eventVerb(word: string) {
  return irregular.get(word) ?? word;
}

export function eventParticiple(word: string) {
  return /(?:ed|en)$/u.test(word) || irregular.has(word);
}

export function eventTriggers(text: string): EventTrigger[] {
  const markers = [...text.matchAll(marker)];
  return markers.flatMap((match, index) => {
    const body = text.slice(match.index + match[0].length, markers[index + 1]?.index)
      .split(/[,;.!?]/u, 1)[0]!.replace(/\s+and\s*$/iu, "");
    const terms = body.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((word) => !/^(?:a|an|the)$/u.test(word)) ?? [];
    return terms.length ? [{ marker: match[1]!.toLowerCase().replace(/\s+/gu, " "), terms }] : [];
  });
}

export function eventLead(text: string) {
  const prefix = leading.exec(text)?.[0] ?? "";
  return { body: text.slice(prefix.length), fronted: eventTriggers(prefix) };
}

export function eventPredicates(body: string, fronted: EventTrigger[], startsAction: (phrase: string) => boolean) {
  const parts = [];
  let start = 0;
  for (const boundary of body.matchAll(conjunction)) {
    const next = boundary.index + boundary[0].length;
    if (!startsAction(body.slice(next))) continue;
    parts.push(body.slice(start, boundary.index).trim());
    start = next;
  }
  parts.push(body.slice(start).trim());
  const local = parts.map(eventTriggers);
  // A trailing condition can govern the entire coordinated series. An
  // earlier explicit condition takes precedence for its own action.
  const shared = local.at(-1)!;
  return parts.map((phrase, index) => ({
    phrase: phrase.replace(/^(?:then|to|be)\s+/iu, ""),
    triggers: [...fronted, ...(local[index]!.length ? local[index]! : shared)],
  }));
}

export function eventNoun(trigger: EventTrigger) {
  return trigger.terms.length === 1 ? eventNouns.get(trigger.terms[0]!) : undefined;
}

function normalizedEvent(terms: readonly string[]) {
  if (terms.join(" ") === "clean up") return "cleaning";
  // "Before maintenance" can refer to contacting maintenance. Keep the
  // normalization narrow so other verbs involving maintenance stay distinct.
  if (terms.join(" ") === "calling maintenance") return "maintenance";
  return terms.map((word) => eventWords.get(word) ?? word).join(" ");
}

export function eventTriggerStatus(
  requested: readonly EventTrigger[], asserted: readonly EventTrigger[],
  sameEvent: (left: readonly string[], right: readonly string[]) => boolean,
) {
  const same = (left: EventTrigger, right: EventTrigger) =>
    normalizedEvent(left.terms) === normalizedEvent(right.terms) || sameEvent(left.terms, right.terms);
  const contradictory = (request: EventTrigger, assertion: EventTrigger) => {
    const { marker: wanted } = request, { marker: found } = assertion;
    const opposite = (positive.test(wanted) && found === "unless") || (wanted === "unless" && positive.test(found));
    const differentTime = time.test(wanted) && time.test(found) && wanted !== found
      && !(wanted.endsWith("after") && found.endsWith("after"));
    return (opposite || differentTime) && same(request, assertion);
  };
  const confirms = (request: EventTrigger, assertion: EventTrigger) => {
    const { marker: wanted } = request, { marker: found } = assertion;
    if (wanted === "during" && positive.test(found) && assertion.terms.at(-1) === "repeats") {
      // A repeated event is a narrower case of the requested event. Keep
      // the source qualification in the returned evidence.
      return same(request, { ...assertion, terms: assertion.terms.slice(0, -1) });
    }
    return (wanted === found || (positive.test(wanted) && positive.test(found))
      || (wanted === "after" && found === "only after")) && same(request, assertion);
  };
  if (requested.every((request) => asserted.some((assertion) => confirms(request, assertion)))) return "matched";
  return requested.some((request) => asserted.some((assertion) => contradictory(request, assertion)))
    ? "contradicted" : "unconfirmed";
}
