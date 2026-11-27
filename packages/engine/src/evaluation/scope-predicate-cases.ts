import type { QueryScopeCase } from "./query-scope-cases.js";

// The first six documents and first five prompts reproduce the November 25 probes.
export const scopePredicateDocuments = [
  { name: "maintenance.md", text: "Technicians must inspect the intake filters and replace worn seals after calibration." },
  { name: "seal-storage.md", text: "Staff must label spare seals before storing them." },
  { name: "gate-drill.md", text: "During a fire drill, gatekeepers must close the loading gate after the announcement." },
  { name: "gate-arrival.md", text: "Gatekeepers must close the loading gate after a forklift enters." },
  { name: "award-log.md", text: "Coordinators must record award nominations in the shared register." },
  { name: "award-display.md", text: "Coordinators may display award nominations after approval." },
  { name: "cabinet-drill.md", text: "During an evacuation drill, attendants must lock and seal the sample cabinet." },
  { name: "cabinet-cleaning.md", text: "After routine cleaning, attendants must lock the sample cabinet and stamp the inspection card." },
  { name: "cabinet-override.md", text: "During an evacuation drill, supervisors may unlock the sample cabinet." },
  { name: "reading-log.md", text: "Inspectors must record and verify pressure readings before the handover." },
  { name: "cargo-log.md", text: "If a cargo manifest is missing, dispatchers must log the delivery and notify the carrier." },
  { name: "cargo-release.md", text: "Unless a cargo manifest is missing, dispatchers must notify the carrier after releasing the shipment." },
] as const;

export const scopePredicateCases: readonly QueryScopeCase[] = [
  { id: "first-predicate", family: "prior-probes", query: "Explain the requirement to inspect the intake filters.", sources: ["maintenance.md"] },
  { id: "second-predicate", family: "prior-probes", query: "Explain the requirement to replace worn seals.", sources: ["maintenance.md"] },
  { id: "distinct-condition", family: "prior-probes", query: "Explain the requirement to close the loading gate during a fire drill.", sources: ["gate-drill.md"] },
  { id: "same-action", family: "prior-probes", query: "Explain the requirement to record award nominations.", sources: ["award-log.md"] },
  { id: "synonymous-action", family: "prior-probes", query: "Explain the requirement to document award nominations.", sources: ["award-log.md"] },
  { id: "shared-object-source", family: "coordination", query: "Explain the requirement to seal the sample cabinet.", sources: ["cabinet-drill.md"] },
  { id: "shared-object-both", family: "coordination", query: "Explain the requirements to lock and seal the sample cabinet during an evacuation drill.", sources: ["cabinet-drill.md"] },
  { id: "distinct-objects-source", family: "coordination", query: "Explain the requirement to stamp the inspection card.", sources: ["cabinet-cleaning.md"] },
  { id: "second-object-mismatch", family: "coordination", query: "Explain the requirement to stamp the sample cabinet.", sources: [] },
  { id: "coordination-negative", family: "coordination", query: "Explain the prohibition on sealing the sample cabinet.", sources: [] },
  { id: "distinct-objects-both", family: "coordination", query: "Explain the requirement to replace worn seals and label spare seals.", sources: ["maintenance.md", "seal-storage.md"] },
  { id: "paraphrased-first-predicate", family: "paraphrase", query: "Explain the requirement to document pressure readings.", sources: ["reading-log.md"] },
  { id: "paraphrased-second-predicate", family: "paraphrase", query: "Explain the requirement to check pressure readings.", sources: ["reading-log.md"] },
  { id: "different-action", family: "paraphrase", query: "Explain the requirement to display award nominations.", sources: [] },
  { id: "paraphrase-object-mismatch", family: "paraphrase", query: "Explain the requirement to document intake filters.", sources: [] },
  { id: "condition-fronted", family: "conditions", query: "During an evacuation drill, explain the requirement to lock the sample cabinet.", sources: ["cabinet-drill.md"] },
  { id: "condition-trailing", family: "conditions", query: "Explain the requirement to lock the sample cabinet after routine cleaning.", sources: ["cabinet-cleaning.md"] },
  { id: "condition-unqualified", family: "conditions", query: "Explain the requirement to lock the sample cabinet.", sources: ["cabinet-drill.md", "cabinet-cleaning.md"] },
  { id: "condition-unsupported", family: "conditions", query: "Explain the requirement to lock the sample cabinet during a forklift inspection.", sources: [] },
  { id: "condition-if", family: "conditions", query: "Explain the requirement to notify the carrier if a cargo manifest is missing.", sources: ["cargo-log.md"] },
  { id: "condition-unless", family: "conditions", query: "Explain the requirement to notify the carrier unless a cargo manifest is missing.", sources: ["cargo-release.md"] },
  { id: "condition-opposing-position", family: "conditions", query: "Explain the permission to unlock the sample cabinet during an evacuation drill.", sources: ["cabinet-override.md"] },
] as const;
