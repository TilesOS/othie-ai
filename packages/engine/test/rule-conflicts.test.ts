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

it("requires a policy subject beyond generic quantities and time units", () => {
  const support = rule("support", "Support agents must acknowledge priority tickets within thirty minutes.");
  for (const query of ["median took seventeen minutes", "thirty minutes", "four hours", "twenty days"])
    expect(selectRules([support], query, [])).toEqual([]);
  expect(selectRules([support], "support acknowledgement time", [])).toEqual([support]);
  expect(selectRules([support], "priority tickets thirty minutes", [])).toEqual([support]);
  expect(selectRules([{ ...support, global: true }], "thirty minutes", [])).toHaveLength(1);
  const chunk = { documentId: support.documentId, revisionId: support.revisionId, text: support.quotation };
  expect(selectRules([support], "thirty minutes", [chunk as never])).toEqual([support]);
});

it("keeps independently relevant evidence from the strongest source together for packing", () => {
  const notice = rule("notice", "Production maintenance must be announced at least 48 hours before it begins.", { documentId: "maintenance", revisionId: "maintenance", sourcePath: "maintenance.md" });
  const emergency = rule("emergency", "Emergency maintenance may start immediately only with incident commander approval.", { documentId: "maintenance", revisionId: "maintenance", sourcePath: "maintenance.md" });
  const deployments = rule("deployments", "Production deployments require approval from the release owner. Except during an active outage, when the incident commander may approve.");
  const query = "production emergency maintenance announcement 48 hours incident commander approval";
  const ranked = selectRules([deployments, emergency, notice], query, []);
  expect(ranked.indexOf(notice)).toBeLessThan(ranked.indexOf(deployments));
  expect(ranked.indexOf(emergency)).toBeLessThan(ranked.indexOf(deployments));
  const unrelated = rule("unrelated", "The payroll system requires monthly access reviews.", { documentId: "maintenance", revisionId: "maintenance", sourcePath: "maintenance.md" });
  expect(selectRules([unrelated, ...ranked], query, [])).not.toContain(unrelated);
  expect(selectRules([deployments, { ...notice, authorityPriority: 100 }], query, [
    { documentId: deployments.documentId, revisionId: deployments.revisionId, text: deployments.quotation } as never,
  ])[0]?.id).toBe("notice");
});
