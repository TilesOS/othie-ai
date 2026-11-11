import { meaningfulTerms } from "../retrieval/terms.js";
import { clauseBindingTerms } from "./clause-bindings.js";

interface Clause { text: string; before: string }

// Keep delimiter identity so a comma qualification can attach to its immediate
// antecedent without turning a later sentence into a query-wide policy cue.
// This scanner is intentionally separate from the frozen prior hypothesis.
function clauses(query: string): Clause[] {
  const parts: Clause[] = [];
  let start = 0, depth = 0, quote = "", before = "";
  for (let index = 0; index < query.length; index++) {
    const char = query[index]!;
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "`" || (char === "'" && !/\p{L}/u.test(query[index - 1] ?? ""))) { quote = char; continue; }
    if (char === "(") depth++;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (depth) continue;
    if (!/[,;.!?\n]/u.test(char) && /[\p{L}\p{N}_]/u.test(query[index - 1] ?? "")) continue;
    const boundary = /^[,;.!?\n]+\s*|^(?:and|but|then)\s+(?=(?:implement|sort|deduplicate|render|change|set|plot|do\s+not)\b)/i.exec(query.slice(index));
    if (!boundary) continue;
    const text = query.slice(start, index).trim();
    if (text) { parts.push({ text, before }); before = ""; }
    before += boundary[0];
    index += boundary[0].length - 1;
    start = index + 1;
  }
  if (query.slice(start).trim()) parts.push({ text: query.slice(start).trim(), before });
  return parts;
}

const company = "company\\s+(?:polic(?:y|ies)|documents|defaults|(?:\\w+\\s+)?requirements)";
const negatedLookup = new RegExp(`\\b(?:(?:do\\s+not|don['’]t|never)\\s+(?:consult|follow|use)|without\\s+(?:consulting|following|using))\\s+(?:the\\s+)?${company}`, "giu");
const trailingQualification = new RegExp(`^(?:following|under|according\\s+to)\\s+(?:the\\s+)?${company}\\b`, "iu");
const negatedOperation = /\b(?:do\s+not|don['’]t|never|avoid)\s+(?:(?:merely|just|only)\s+)?(?=sort\b|deduplicate\b)/giu;

/** Evaluation-only association heuristic; no fixture labels or source vocabulary. */
export function qualifiedBindingTerms(query: string): string[] {
  query = query.replace(/\bliteral\s+(?:text|string)\s+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/giu, "literal");
  const parts = clauses(query).map((part) => ({ ...part, text: part.text.replace(negatedLookup, " ") }));
  return [...new Set(parts.flatMap((part, index) => {
    const next = parts[index + 1];
    const qualified = next && /^,\s*$/.test(next.before) && trailingQualification.test(next.text);
    // A replacement instruction can refer back to the negated operation's
    // subject. Explicit calls/quoted names in the replacement get their own
    // scope instead. Prose antecedents remain ambiguous and are scored below.
    const replacement = next && /^(?:implement|apply)\b/i.test(next.text)
      && !/[$_\p{L}][$_\p{L}\p{N}]*\s*\(|["'`]/u.test(next.text);
    const negated = new RegExp(negatedOperation.source, "iu").test(part.text);
    if (qualified || (negated && replacement)) return meaningfulTerms(part.text);
    // Negation of a local operation alone does not make its identifier a policy
    // subject. Remove the operator before applying the unchanged prior masker.
    return clauseBindingTerms(part.text.replace(negatedOperation, ""));
  }))];
}
