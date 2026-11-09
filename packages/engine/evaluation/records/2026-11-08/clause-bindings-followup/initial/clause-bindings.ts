import { meaningfulTerms } from "../retrieval/terms.js";

// Shadow hypothesis only. These boundaries are prose heuristics, not a code or
// intent parser. Preserve the sentence-based candidate for paired comparisons.
function clauses(query: string): string[] {
  const parts: string[] = [];
  let start = 0, depth = 0, quote = "";
  for (let index = 0; index < query.length; index++) {
    const char = query[index]!;
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
      continue;
    }
    // Apostrophes within words are not quotation delimiters.
    if (char === '"' || char === "`" || (char === "'" && !/\p{L}/u.test(query[index - 1] ?? ""))) { quote = char; continue; }
    if (char === "(") depth++;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (depth || /[\p{L}\p{N}_]/u.test(query[index - 1] ?? "")) continue;
    const boundary = /^[,;.!?\n]+\s*|^(?:and|but|then)\s+(?=(?:implement|sort|deduplicate|render|change|set|plot|do\s+not)\b)/i.exec(query.slice(index));
    if (boundary) {
      parts.push(query.slice(start, index));
      index += boundary[0].length - 1;
      start = index + 1;
    }
  }
  parts.push(query.slice(start));
  return parts;
}

function eraseCalls(clause: string): string {
  const call = /[$_\p{L}][$_\p{L}\p{N}]*\s*\(/gu;
  let output = "", start = 0;
  for (let match = call.exec(clause); match; match = call.exec(clause)) {
    let depth = 1, index = call.lastIndex, quote = "";
    for (; index < clause.length && depth; index++) {
      const char = clause[index]!;
      if (quote) {
        if (char === "\\") index++;
        else if (char === quote) quote = "";
      } else if (char === '"' || char === "'" || char === "`") quote = char;
      else if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    // Keep malformed calls visible rather than silently discarding their tail.
    if (depth) break;
    output += clause.slice(start, match.index) + " ";
    start = index;
    call.lastIndex = index;
  }
  return output + clause.slice(start);
}

export function clauseBindingTerms(query: string): string[] {
  // Literal rendering is removed before boundary/cue detection so punctuation
  // and operation words within the literal do not affect adjacent clauses.
  query = query.replace(/\bliteral\s+(?:text|string)\s+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/giu, "literal");
  const identifier = "[$_\\p{L}][$_\\p{L}\\p{N}]*";
  return meaningfulTerms(clauses(query).map((clause) => {
    const local = /\b(?:sort|deduplicate|validates?\s+and\s+wraps)\b/i.test(clause);
    const negated = /\b(?:do\s+not|don['’]t|never|avoid)\s+(?:sort|deduplicate)\b/i.test(clause);
    const companyCue = /\b(?:company\s+(?:polic(?:y|ies)|documents|defaults|\w+\s+requirements)|according\s+to\s+(?:the\s+)?company)\b/i.test(clause);
    if (local && !negated && !companyCue) {
      clause = eraseCalls(clause);
      clause = clause.replace(new RegExp(`\\bvariable(?:\\s+named|\\s+called)?\\s+([\x60"']?)${identifier}\\1`, "giu"), "variable");
    }
    if (/\b(?:css|pixels)\b/i.test(clause)) clause = clause.replace(new RegExp(`\\b${identifier}(?=\\s+(?:panel|width)\\b)`, "giu"), "element");
    return clause;
  }).join(" "));
}
