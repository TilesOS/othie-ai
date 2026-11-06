import { expect, it } from "vitest";
import { parserGlobCases } from "./lint-parser-fixtures";
import { probeParserGlobCase } from "./lint-parser-harness";

it.each(parserGlobCases)("preserves TypeScript project-service glob behavior: $id", async (item) => {
  const result = await probeParserGlobCase(item);
  expect(result.outcome).toBe(item.expected);
  expect(result.type).toBe(item.expected === "typed" ? "number" : null);
});
