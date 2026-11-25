import type { QueryScopeCase } from "./query-scope-cases.js";

// Freeze these source judgments before implementing the comparison.
export const scopeActionDocuments = [
  { name: "badge-log.md", text: "Reception must record visitor badges before opening the lobby. Staff may print roster copies after opening." },
  { name: "badge-print.md", text: "Visitor badges may be printed at reception after the roster is locked." },
  { name: "badge-inspection.md", text: "If a visitor badge is recorded twice, staff must inspect the badge printer. Staff must record printer jams before maintenance." },
  { name: "badge-register.md", text: "The legacy access standard prohibits recording visitor badges. An approved exception allows recording contractor badges during a drill." },
  { name: "filter-cleaning.md", text: "Technicians must clean the intake filters with a soft brush. During a pressure alarm, the filters may be cleaned at the service bench." },
  { name: "filter-replacement.md", text: "Technicians must replace the intake filters when a pressure alarm repeats. Staff must clean the service bench after replacement." },
  { name: "pressure-log.md", text: "Operators must log pressure alarms in the shift ledger. If an intake filter is cleaned, operators must close the cabinet." },
  { name: "vent-cleaning.md", text: "Technicians must clean exhaust vents during a pressure alarm. Staff must inspect intake filters before closing the cabinet." },
] as const;

export const scopeActionCases: readonly QueryScopeCase[] = [
  { id: "action-active", family: "shared-object", query: "Explain the requirement to record visitor badges before opening the lobby.", sources: ["badge-log.md"] },
  { id: "action-passive", family: "shared-object", query: "Explain the permission to print visitor badges after the roster locks.", sources: ["badge-print.md"] },
  { id: "action-prohibition", family: "shared-object", query: "Enforce the prohibition on recording visitor badges.", sources: ["badge-register.md"] },
  { id: "action-other-object", family: "shared-object", query: "Apply the requirement to record printer jams.", sources: ["badge-inspection.md"] },
  { id: "action-trigger", family: "conditions", query: "Explain the requirement to inspect the badge printer when a visitor badge is recorded twice.", sources: ["badge-inspection.md"] },
  { id: "action-fronted-trigger", family: "conditions", query: "During a drill, explain the permission to record contractor badges.", sources: ["badge-register.md"] },
  { id: "action-conditional-exception", family: "conditions", query: "Explain the permission to clean intake filters at the service bench during a pressure alarm.", sources: ["filter-cleaning.md"] },
  { id: "action-conditional-requirement", family: "conditions", query: "Explain the obligation to replace intake filters during a pressure alarm.", sources: ["filter-replacement.md"] },
  { id: "action-transposed-object", family: "conditions", query: "Explain the requirement to clean the service bench after replacing intake filters.", sources: ["filter-replacement.md"] },
  { id: "action-compound", family: "coordination", query: "Explain pressure alarm logging and the intake filter cleaning exception.", sources: ["pressure-log.md", "filter-cleaning.md"] },
  { id: "action-shared-head", family: "coordination", query: "Explain the requirements to clean and replace the intake filters.", sources: ["filter-cleaning.md", "filter-replacement.md"] },
  { id: "action-distinct-objects", family: "coordination", query: "Explain the requirements to clean exhaust vents and inspect intake filters.", sources: ["vent-cleaning.md"] },
  { id: "action-opposed-comparison", family: "coordination", query: "Compare the requirement and the prohibition on recording visitor badges.", sources: ["badge-log.md", "badge-register.md"] },
  { id: "action-named-prohibition", family: "coordination", query: "Apply the legacy access standard for visitor badge recording.", sources: ["badge-register.md"] },
  { id: "action-unsupported-combination", family: "unsupported", query: "Explain the requirement to replace exhaust vents.", sources: [] },
  { id: "action-unsupported-object", family: "unsupported", query: "Explain the permission to print contractor badges.", sources: [] },
  { id: "action-unsupported-position", family: "unsupported", query: "Explain the prohibition on cleaning intake filters.", sources: [] },
  { id: "action-literal", family: "unsupported", query: "Print ‘record visitor badges’ in the test banner. Deduplicate rows using the local fixture.", sources: [] },
];
