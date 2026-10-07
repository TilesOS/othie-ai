import { expect, it, vi } from "vitest";
import { evaluateApplicability, validateApplicability } from "../src/evaluation/applicability.js";
import type { RuleRecord } from "../src/types.js";
import type { ModelProvider } from "../src/providers/types.js";

const query = "Implement digital badge checks before entering the lab";
const evidence = [{ id: "r1", text: "Visitors must obtain digital badges before entering the lab." },
  { id: "r2", text: "Employees must retain receipts." }];
const decisions = [
  { id: "r1", explanation: "Entry checks must enforce this requirement.", applies: true, task_quote: "digital badge checks", evidence_quote: "digital badges before entering the lab" },
  { id: "r2", explanation: "Receipts do not constrain lab entry.", applies: false, task_quote: "", evidence_quote: "" },
];
const rules: RuleRecord[] = evidence.map(({ id, text }) => ({ id, text, quotation: text, profile: "company", documentId: "d", revisionId: "v",
  sourcePath: "/private/policy.md", category: "generated label", applicability: "generated scope", location: "lines 1-1", authorityPriority: 80,
  global: false, modelIdentity: "test", promptVersion: "test" }));

it("requires complete decisions grounded in each item's own original evidence and task", () => {
  expect(validateApplicability({ decisions }, query, evidence)).toEqual(decisions);
  expect(() => validateApplicability({ decisions: decisions.slice(0, 1) }, query, evidence)).toThrow("Incomplete");
  for (const invalid of [
    [...decisions, decisions[0]], [{ ...decisions[0], id: "invented" }, decisions[1]],
    [{ ...decisions[0], evidence_quote: evidence[1]!.text }, decisions[1]],
    [{ ...decisions[0], task_quote: "invented task" }, decisions[1]],
    [{ ...decisions[0], evidence_quote: " " }, decisions[1]],
    [decisions[0], { ...decisions[1], task_quote: "digital badge" }],
  ]) expect(() => validateApplicability({ decisions: invalid }, query, evidence)).toThrow();
});

it("filters whole original rules without publishing generated reasoning, changing ranking or exposing source paths", async () => {
  const generateJson = vi.fn<ModelProvider["generateJson"]>(async (messages) => {
    const sent = JSON.parse(messages[1]!.content);
    expect(sent.evidence).toEqual(evidence);
    expect(messages[1]!.content).not.toContain("/private/");
    expect(messages[1]!.content).not.toContain("generated scope");
    return { decisions: [...decisions].reverse() };
  });
  const global = { ...rules[1]!, id: "global", global: true };
  const result = await evaluateApplicability({ rules: [global, ...rules], query, provider: { generateJson } as never,
    model: "installed", signal: new AbortController().signal });
  expect(result.rules).toEqual([global, rules[0]]);
  expect(result.rules[1]).toBe(rules[0]);
  expect(JSON.stringify(result.rules)).not.toContain("Entry checks must enforce");
  expect(generateJson).toHaveBeenCalledTimes(1);
  expect(await evaluateApplicability({ rules: [global], query, provider: { generateJson } as never,
    model: "installed", signal: new AbortController().signal })).toEqual({ rules: [global], decisions: [] });
  expect(generateJson).toHaveBeenCalledTimes(1);
});

it("rejects invalid and late decisions atomically and honors cancellation before export", async () => {
  const controller = new AbortController();
  const generateJson = vi.fn<ModelProvider["generateJson"]>(async () => ({ decisions: decisions.slice(0, 1) }));
  const input = { rules, query, provider: { generateJson } as never, model: "installed", signal: controller.signal };
  await expect(evaluateApplicability(input)).rejects.toThrow("Incomplete");
  generateJson.mockImplementation(async () => { controller.abort(); return { decisions }; });
  await expect(evaluateApplicability(input)).rejects.toThrow();
  generateJson.mockClear();
  await expect(evaluateApplicability(input)).rejects.toThrow();
  expect(generateJson).not.toHaveBeenCalled();
});
