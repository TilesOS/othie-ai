/** Keep following exception/qualification sentences attached to the statement they qualify. */
export function evidenceUnits(text: string): string[] {
  const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)].map(({ segment }) => segment.trim()).filter(Boolean);
  const units: string[] = [];
  for (const sentence of sentences) {
    if (units.length && /^(except\b|unless\b|however\b|otherwise\b|only\b|provided\b|subject to\b|this\b|these\b|that\b|those\b|it\b)/i.test(sentence)) units[units.length - 1] += ` ${sentence}`;
    else units.push(sentence);
  }
  return units;
}
