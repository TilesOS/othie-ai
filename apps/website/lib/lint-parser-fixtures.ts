// Exercise the parser's actual allowDefaultProject consumer, not a standalone matcher.
export type ParserGlobCase = {
  id: string;
  pattern: string | null;
  file: string;
  expected: "typed" | "unmatched" | "invalid-pattern" | "included-conflict";
};

export const parserGlobCases: ParserGlobCase[] = [];
for (const item of [
  { id: "star", pattern: "allowed*.ts", match: "allowed-file.ts", miss: "blocked.ts" },
  { id: "question", pattern: "file?.ts", match: "fileA.ts", miss: "fileAB.ts" },
  { id: "class", pattern: "file[AB].ts", match: "fileB.ts", miss: "fileC.ts" },
  { id: "braces", pattern: "{allowed,shared}.ts", match: "shared.ts", miss: "blocked.ts" },
  { id: "extglob", pattern: "@(allowed|shared).ts", match: "allowed.ts", miss: "blocked.ts" },
  { id: "negation", pattern: "!blocked.ts", match: "allowed.ts", miss: "blocked.ts" },
  { id: "nested", pattern: "tools/*.ts", match: "tools/allowed.ts", miss: "other/allowed.ts" },
  { id: "dot", pattern: "allowed*.ts", match: "allowed.hidden.ts", miss: ".allowed.ts" },
  { id: "bmp", pattern: "?.ts", match: "é.ts", miss: "éa.ts" },
  { id: "literal", pattern: "exact.ts", match: "exact.ts", miss: "inexact.ts" },
]) {
  for (const [kind, file, expected] of [["match", item.match, "typed"], ["miss", item.miss, "unmatched"]] as const) {
    parserGlobCases.push({ id: `${item.id}-${kind}`, pattern: item.pattern, file, expected });
  }
}
parserGlobCases.push(
  { id: "leading-dot", pattern: "*.ts", file: ".hidden.ts", expected: "typed" },
  { id: "astral-one-question", pattern: "?.ts", file: "😀.ts", expected: "unmatched" },
  { id: "astral-two-questions", pattern: "??.ts", file: "😀.ts", expected: "typed" },
  { id: "combining-one-question", pattern: "?.ts", file: "e\u0301.ts", expected: "unmatched" },
  { id: "combining-two-questions", pattern: "??.ts", file: "e\u0301.ts", expected: "typed" },
  { id: "wide-star-rejected", pattern: "*", file: "allowed.ts", expected: "invalid-pattern" },
  { id: "globstar-rejected", pattern: "**/*.ts", file: "allowed.ts", expected: "invalid-pattern" },
  { id: "included-conflict", pattern: "src/*.ts", file: "src/included.ts", expected: "included-conflict" },
  { id: "included-without-default", pattern: null, file: "src/included.ts", expected: "typed" },
  { id: "excluded-without-default", pattern: null, file: "excluded.ts", expected: "unmatched" },
);
