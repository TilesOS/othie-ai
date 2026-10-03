import { expect, it } from "vitest";
import { conflictGroups, selectRules } from "../src/rules/selection.js";
import type { RuleRecord } from "../src/types.js";

function rule(id: string, quotation: string, overrides: Partial<RuleRecord> = {}): RuleRecord {
  return { id, quotation, text: quotation, profile: "company", documentId: id, revisionId: id,
    sourcePath: `${id}.md`, category: id, applicability: id, location: "paragraph 1",
    authorityPriority: 80, global: false, modelIdentity: "test", promptVersion: "test", ...overrides };
}

it("detects exact evidence opposition despite different generated categories and scope labels", () => {
  const allow = rule("allow", "Employees may export customer records as CSV for the migration project.");
  const deny = rule("deny", "Employees must not export customer records as CSV for the migration project.");
  expect(conflictGroups([allow, deny])).toEqual([["allow", "deny"]]);
});

it("keeps different subjects, conditions, and exceptions out of evidence conflicts", () => {
  const allow = rule("allow", "Employees may export customer records as CSV for the migration project.");
  for (const quotation of [
    "Contractors must not export customer records as CSV for the migration project.",
    "Employees must not export customer records as CSV for the archive project.",
    "Employees must not export customer records as CSV for the migration project unless approved.",
    "Employees must not export customer records as CSV for the migration project. Except approved migrations.",
  ]) expect(conflictGroups([allow, rule("deny", quotation)])).toEqual([]);
});

it("does not mistake compatible evidence for opposition when labels differ", () => {
  const allow = rule("allow", "Employees may export customer records as CSV for the migration project.");
  expect(conflictGroups([allow, rule("receipt", "Employees must submit receipts.")])).toEqual([]);
  expect(conflictGroups([allow, rule("also-allow", allow.quotation)])).toEqual([]);
});

it("does not retrieve a rule solely through generated scope or category wording", () => {
  const telemetry = rule("telemetry", "A missing consent value is not explicit consent.", {
    applicability: "Missing or implied consent is invalid", category: "Vendor product validation",
  });
  expect(selectRules([telemetry], "vendor product example.invalid indexed documents", [])).toEqual([]);
  expect(selectRules([telemetry], "missing consent", [])).toEqual([telemetry]);
  expect(selectRules([{ ...telemetry, global: true }], "repository comparator", [])).toHaveLength(1);
});
