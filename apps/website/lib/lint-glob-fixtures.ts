import type { Linter } from "eslint";

// Fixed migration controls, shared by Vitest and the disposable-process probe.
// Expectations describe the installed legacy plugins, including Unicode behavior.
export type LintGlobCase = {
  id: string;
  rule: string;
  options: Record<string, unknown>;
  source: string;
  file: string;
  expectedDiagnostic: boolean;
};

export const lintGlobCases: LintGlobCase[] = [];
const componentPatterns = [
  { id: "star", pattern: "Field*", match: "FieldInput", miss: "OtherInput" },
  { id: "question", pattern: "Field?", match: "FieldA", miss: "FieldAB" },
  { id: "class", pattern: "Field[AB]", match: "FieldB", miss: "FieldC" },
  { id: "braces", pattern: "{Field,Input}Panel", match: "InputPanel", miss: "OtherPanel" },
  { id: "extglob", pattern: "@(Field|Input)Panel", match: "FieldPanel", miss: "OtherPanel" },
  { id: "negation", pattern: "!Safe*", match: "FieldPanel", miss: "SafePanel" },
];
for (const item of componentPatterns) {
  for (const [kind, name, matches] of [["match", item.match, true], ["miss", item.miss, false]] as const) {
    lintGlobCases.push({
      id: `react-${item.id}-${kind}`, rule: "react/no-danger",
      options: { customComponentNames: [item.pattern] },
      source: `export default function Preview() { return <${name} dangerouslySetInnerHTML={{ __html: "hello" }} />; }`,
      file: "lib/lint-fixtures/danger.tsx", expectedDiagnostic: matches,
    }, {
      id: `a11y-${item.id}-${kind}`, rule: "jsx-a11y/label-has-associated-control",
      options: { controlComponents: [item.pattern], assert: "nesting" },
      source: `export default function Preview() { return <label>Name<${name} /></label>; }`,
      file: "lib/lint-fixtures/label.tsx", expectedDiagnostic: !matches,
    });
  }
}

const exceptionPatterns = [
  { id: "globstar", pattern: "**/allowed/**", match: "allowed/deep/mixed.js", miss: "blocked/deep/mixed.js" },
  { id: "braces", pattern: "**/{allowed,shared}/**", match: "shared/mixed.js", miss: "blocked/mixed.js" },
  { id: "extglob", pattern: "**/@(allowed|shared)/**", match: "allowed/mixed.js", miss: "blocked/mixed.js" },
  { id: "class", pattern: "**/zone[12]/**", match: "zone2/mixed.js", miss: "zone3/mixed.js" },
  { id: "dotfile", pattern: "**/allowed/*", match: "allowed/mixed.js", miss: "allowed/.mixed.js" },
];
for (const item of exceptionPatterns) {
  for (const [kind, file, matches] of [["match", item.match, true], ["miss", item.miss, false]] as const) {
    lintGlobCases.push({
      id: `import-exception-${item.id}-${kind}`, rule: "import/no-import-module-exports",
      options: { exceptions: [item.pattern] }, source: 'import React from "react"; module.exports = React;',
      file: `lib/lint-fixtures/${file}`, expectedDiagnostic: !matches,
    });
  }
}

for (const item of [
  { id: "braces", pattern: "pkg/{private,internal}/**", match: "pkg/internal/value", miss: "pkg/public/value" },
  { id: "extglob", pattern: "pkg/@(private|internal)/**", match: "pkg/private/value", miss: "pkg/public/value" },
  { id: "globstar", pattern: "pkg/private/**", match: "pkg/private/deep/value", miss: "pkg/public/value" },
]) {
  for (const [kind, specifier, matches] of [["match", item.match, true], ["miss", item.miss, false]] as const) {
    lintGlobCases.push({
      id: `import-make-re-${item.id}-${kind}`, rule: "import/no-internal-modules",
      options: { forbid: [item.pattern] }, source: `import value from "${specifier}"; export default value;`,
      file: "lib/lint-fixtures/internal.ts", expectedDiagnostic: matches,
    });
  }
}

for (const item of [
  { id: "match-base", pattern: "allowed*", specifier: "pkg/allowed-module", expected: false },
  { id: "match-base-control", pattern: "allowed*", specifier: "pkg/blocked-module", expected: true },
  { id: "comment", pattern: "#*", specifier: "#internal", expected: true },
  { id: "question", pattern: "?", specifier: "pkg/a", expected: false },
  { id: "question-control", pattern: "?", specifier: "pkg/ab", expected: true },
  { id: "unicode-bmp", pattern: "?", specifier: "pkg/é", expected: false },
  { id: "unicode-astral", pattern: "?", specifier: "pkg/😀", expected: true },
]) {
  lintGlobCases.push({
    id: `import-namespace-${item.id}`, rule: "import/no-namespace",
    options: { ignore: [item.pattern] }, source: `import * as value from "${item.specifier}"; export default value;`,
    file: "lib/lint-fixtures/namespace.ts", expectedDiagnostic: item.expected,
  });
}

for (const [kind, name, expected] of [["match", "HTML_PANEL", false], ["miss", "OTHER_PANEL", true]] as const) {
  lintGlobCases.push({
    id: `react-pascal-${kind}`, rule: "react/jsx-pascal-case", options: { ignore: ["{HTML,XML}_*"] },
    source: `export default function Preview() { return <${name} />; }`,
    file: "lib/lint-fixtures/pascal.tsx", expectedDiagnostic: expected,
  });
}

export function rulesForGlobCase(item: LintGlobCase): Linter.RulesRecord {
  return { [item.rule]: ["error", item.options] };
}
