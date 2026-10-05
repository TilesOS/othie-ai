import { expect, it } from "vitest";
import { extractRules, validateExtractedRules } from "../src/rules/extractor.js";
import { configSchema } from "../src/config.js";
import type { ChunkRecord } from "../src/types.js";

const chunk: ChunkRecord = { id: "policy", documentId: "document", revisionId: "revision", profile: "company",
  sourcePath: "policy.md", sourceRole: "authoritative", authorityPriority: 80, retrievalWeight: 1,
  heading: "Leave", location: "paragraph 1", text: "Leave\nEmployees receive twenty days.\n  Except contractors, who receive ten. Unused days do not carry over.",
  contentHash: "hash", tokenCount: 30 };
const proposal = { source_id: "policy", category: "leave", applicability: "employees", first_sentence: 1, last_sentence: 2 };

it("recovers full original sentences and intervening whitespace without the heading", () => {
  const [rule] = validateExtractedRules({ rules: [proposal] }, [chunk], false, "test");
  expect(rule?.text).toBe("Employees receive twenty days.\n  Except contractors, who receive ten.");
  expect(rule?.quotation).toBe(rule?.text);
  expect(chunk.text.includes(rule!.quotation)).toBe(true);
});

it("rejects unknown, out-of-bounds, reversed, and non-authoritative selections", () => {
  for (const bad of [{ source_id: "unknown" }, { first_sentence: 4, last_sentence: 4 }, { last_sentence: 4 }, { first_sentence: 3 }]) {
    expect(validateExtractedRules({ rules: [{ ...proposal, ...bad }] }, [chunk], false, "test")).toEqual([]);
  }
  expect(validateExtractedRules({ rules: [proposal] }, [{ ...chunk, sourceRole: "reference" }], false, "test")).toEqual([]);
  for (const first_sentence of [0, -1, 1.5, "1"]) {
    expect(() => validateExtractedRules({ rules: [{ ...proposal, first_sentence }] }, [chunk], false, "test")).toThrow();
  }
});

it("keeps following qualifications with their statement even when the model selects only one sentence", () => {
  const expected = "Employees receive twenty days.\n  Except contractors, who receive ten.";
  for (const number of [1, 2]) {
    const [rule] = validateExtractedRules({ rules: [{ ...proposal, first_sentence: number, last_sentence: number }] }, [chunk], false, "test");
    expect(rule?.text).toBe(expected);
  }
});

it("rejects rewritten text and drops oversized spans without truncating evidence", () => {
  expect(() => validateExtractedRules({ rules: [{ ...proposal, text: "Contractors receive twenty days." }] }, [chunk], false, "test")).toThrow();
  expect(validateExtractedRules({ rules: [proposal] }, [{ ...chunk, text: `Employees must ${"keep ".repeat(500)}records. Except contractors.` }], false, "test")).toEqual([]);
});

it("deduplicates the same selected span even when generated labels differ", () => {
  expect(validateExtractedRules({ rules: [proposal, { ...proposal, category: "vacation" }] }, [chunk], false, "test")).toHaveLength(1);
});

it("sends numbered body sentences only and never exports reference evidence for extraction", async () => {
  const config = configSchema.parse({ version: 1, profiles: { company: { sources: [{ root: "/synthetic", role: "authoritative" }] } } });
  let sent = "";
  const providers = { require: () => ({ generateJson: async (messages: Array<{ content: string }>) => {
    sent = messages[1]!.content;
    return { rules: [{ ...proposal, source_id: "s1" }] };
  } }) };
  const rules = await extractRules({ chunks: [chunk, { ...chunk, id: "reference", sourceRole: "reference", text: "PRIVATE_REFERENCE_CANARY" }],
    config, profile: config.profiles.company!, providers: providers as never, global: true });
  expect(JSON.parse(sent).sources).toEqual([{ source_id: "s1", sentences: [
    { number: 1, text: "Employees receive twenty days." },
    { number: 2, text: "Except contractors, who receive ten." },
    { number: 3, text: "Unused days do not carry over." },
  ] }]);
  expect(sent).not.toContain("PRIVATE_REFERENCE_CANARY");
  expect(rules[0]?.global).toBe(true);
  expect(rules[0]?.documentId).toBe(chunk.documentId);
  expect(rules[0]?.revisionId).toBe(chunk.revisionId);
  expect(rules[0]?.sourcePath).toBe(chunk.sourcePath);
});

it("constrains generation to invocation-local source IDs and still rejects fabricated IDs", async () => {
  const config = configSchema.parse({ version: 1, profiles: { company: { sources: [{ root: "/synthetic", role: "authoritative" }] } } });
  const enums: string[][] = [];
  const providers = { require: () => ({ generateJson: async (_messages: unknown, _model: string, schema: any) => {
    enums.push(schema.properties.rules.items.properties.source_id.enum);
    return { rules: [{ ...proposal, source_id: "s3" }] };
  } }) };
  const input = { config, profile: config.profiles.company!, providers: providers as never, global: false };
  expect(await extractRules({ ...input, chunks: [chunk, { ...chunk, id: "second", documentId: "other" }, { ...chunk, id: "reference", sourceRole: "reference" }] })).toEqual([]);
  expect(await extractRules({ ...input, chunks: [chunk] })).toEqual([]);
  expect(enums).toEqual([["s1", "s2"], ["s1"]]);
});
