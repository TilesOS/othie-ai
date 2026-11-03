import { ESLint } from "eslint";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { lintGlobCases, rulesForGlobCase } from "./lint-glob-fixtures";

const website = fileURLToPath(new URL("../", import.meta.url));
const config = fileURLToPath(new URL("../eslint.config.mjs", import.meta.url));

it.each(lintGlobCases)("preserves legacy glob behavior: $id", async (item) => {
  const eslint = new ESLint({ cwd: website, overrideConfigFile: config,
    overrideConfig: [{ rules: rulesForGlobCase(item) }] });
  const [result] = await eslint.lintText(item.source, { filePath: item.file });
  expect(result).toBeDefined();
  expect(result!.fatalErrorCount).toBe(0);
  expect(result!.messages.filter((message) => message.ruleId === null)).toEqual([]);
  expect(result!.messages.some((message) => message.ruleId === item.rule)).toBe(item.expectedDiagnostic);
});
