import { meaningfulTerms } from "../retrieval/terms.js";

/** Shadow hypothesis: erase local bindings, not every code-expressed subject.
 * Sentence cues are deliberately shallow and cannot establish semantic intent.
 * No source names, expected labels or document vocabulary enter this function.
 */
export function localBindingTerms(query: string): string[] {
  const identifier = "[$_\\p{L}][$_\\p{L}\\p{N}]*";
  const localCall = /\b(?:sort|deduplicate|numeric|validates?\s+and\s+wraps)\b/i;
  return meaningfulTerms([...new Intl.Segmenter("en", { granularity: "sentence" }).segment(query)]
    .map(({ segment }) => {
      if (localCall.test(segment)) {
        // Innermost calls first; bounded by input length, without parsing code.
        const call = new RegExp(`(${identifier}\\s*\\()([^()]*)\\)`, "gu");
        segment = segment.replace(call, "$1)");
        segment = segment.replace(new RegExp(`\\bvariable(?:\\s+named|\\s+called)?\\s+${identifier}`, "giu"), "variable");
      }
      if (/\b(?:css|pixels)\b/i.test(segment)) {
        segment = segment.replace(new RegExp(`\\b${identifier}(?=\\s+(?:panel|width)\\b)`, "giu"), "element");
      }
      // Literal-only rendering is a local task; active quoted policy subjects
      // outside that narrow phrase remain visible.
      segment = segment.replace(/\bliteral\s+(?:text|string)\s+(?:"[^"\n]*"|'[^'\n]*')/giu, "literal");
      return segment;
    }).join(" "));
}
