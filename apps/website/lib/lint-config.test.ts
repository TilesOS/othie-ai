import { ESLint, type Linter } from "eslint";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const website = fileURLToPath(new URL("../", import.meta.url));
const config = fileURLToPath(new URL("../eslint.config.mjs", import.meta.url));

async function lint(source: string, filePath: string, rules: Linter.RulesRecord = {}) {
  // Use the installed website config and plugins, with virtual files only.
  // Extra rules exercise legacy minimatch calls absent from ordinary site lint.
  const eslint = new ESLint({ cwd: website, overrideConfigFile: config, overrideConfig: [{ rules }] });
  const [result] = await eslint.lintText(source, { filePath });
  expect(result).toBeDefined();
  expect(result!.fatalErrorCount).toBe(0);
  expect(result!.messages.filter((message) => message.ruleId === null)).toEqual([]);
  return result!.messages.map((message) => message.ruleId);
}

it("executes the installed Next, React, accessibility and TypeScript rules", async () => {
  const messages = await lint(`
    export default function Preview({ items }: { items: any[] }) {
      return <main><img src="/photo.png" />{items.map(item => <span>{item}</span>)}</main>;
    }
  `, "lib/lint-fixtures/recommended.tsx");
  expect(messages).toEqual(expect.arrayContaining([
    "@next/next/no-img-element", "react/jsx-key", "jsx-a11y/alt-text", "@typescript-eslint/no-explicit-any",
  ]));
});

it("preserves React custom-component glob matches and nonmatches", async () => {
  const rules: Linter.RulesRecord = { "react/no-danger": ["error", { customComponentNames: ["Html*"] }] };
  const source = (name: string) => `export default function Preview() { return <${name} dangerouslySetInnerHTML={{ __html: "hello" }} />; }`;
  expect(await lint(source("HtmlPanel"), "lib/lint-fixtures/danger.tsx", rules)).toContain("react/no-danger");
  expect(await lint(source("OtherPanel"), "lib/lint-fixtures/safe.tsx", rules)).not.toContain("react/no-danger");
});

it("preserves import exception globs without silencing nonmatching files", async () => {
  const rules: Linter.RulesRecord = { "import/no-import-module-exports": ["error", { exceptions: ["**/allowed/**"] }] };
  const source = 'import React from "react"; module.exports = React;';
  expect(await lint(source, "lib/lint-fixtures/allowed/mixed.js", rules)).not.toContain("import/no-import-module-exports");
  expect(await lint(source, "lib/lint-fixtures/blocked/mixed.js", rules)).toContain("import/no-import-module-exports");
});

it("preserves accessibility control-component glob matches and nonmatches", async () => {
  const rule = "jsx-a11y/label-has-associated-control";
  const rules: Linter.RulesRecord = { [rule]: ["error", { controlComponents: ["Input*"], assert: "nesting" }] };
  const source = (name: string) => `export default function Preview() { return <label>Name<${name} /></label>; }`;
  expect(await lint(source("InputField"), "lib/lint-fixtures/labelled.tsx", rules)).not.toContain(rule);
  expect(await lint(source("OtherField"), "lib/lint-fixtures/unlabelled.tsx", rules)).toContain(rule);
});

it("keeps generated output ignored while linting application files", async () => {
  const eslint = new ESLint({ cwd: website, overrideConfigFile: config });
  for (const file of [".next/types/routes.ts", "out/nested/page.js", "build/chunk.js", "next-env.d.ts"]) {
    expect(await eslint.isPathIgnored(file), file).toBe(true);
  }
  for (const file of ["app/page.tsx", "lib/platform.ts", "components/preview.tsx"]) {
    expect(await eslint.isPathIgnored(file), file).toBe(false);
  }
});
