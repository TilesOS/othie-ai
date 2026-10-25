import { expect, it } from "vitest";
import { agentCases } from "../src/evaluation/agent-cases.js";
import { gradeCode } from "../src/evaluation/agent-grader.js";
import { nativeAgentCases } from "../src/evaluation/native-agent-cases.js";

it("scores new boundary, exception and linked-condition cases independently of completion claims", async () => {
  const solutions: Record<string, string> = {
    "expense-documentation": "function solve(amount, state) { return amount <= 25 || state === 'supplied' ? 'complete' : state === 'lost' ? 'explanation' : 'incomplete'; }",
    "access-expiration": "function solve(hours, ext) { const valid = ext && ext.approver === 'incident-commander' && ext.addedHours <= 2 && ext.recordedAt < 8; return hours < 8 + (valid ? ext.addedHours : 0); }",
    "regional-renewal": "function solve(region, trial, setting) { return !trial && (setting === null ? region === 'AU' : setting); }",
  };
  expect(nativeAgentCases.slice(0, agentCases.length)).toEqual(agentCases);
  for (const scenario of nativeAgentCases.filter((item) => solutions[item.id])) {
    const grade = await gradeCode(solutions[scenario.id]!, scenario.hiddenProbes);
    expect(grade.passed).toBe(grade.total);
    expect((await gradeCode(scenario.initial, scenario.hiddenProbes)).passed).toBeLessThan(grade.total);
  }
  const access = nativeAgentCases.find((item) => item.id === "access-expiration")!;
  const tooLate = solutions[access.id]!.replace("ext.recordedAt < 8", "ext.recordedAt <= 8");
  expect((await gradeCode(tooLate, access.hiddenProbes)).passed).toBeLessThan(access.hiddenProbes.length);
  const override = solutions["regional-renewal"]!.replace("!trial && ", "");
  const renewal = nativeAgentCases.find((item) => item.id === "regional-renewal")!;
  expect((await gradeCode(override, renewal.hiddenProbes)).passed).toBeLessThan(renewal.hiddenProbes.length);
});
