import type { QueryScopeCase } from "./query-scope-cases.js";

// Freeze these source judgments before implementing the comparison.
export const scopePositionDocuments = [
  { name: "humidity-log.md", text: "The conservator must log humidity alarms before opening the gallery." },
  { name: "lens-cleaning.md", text: "Camera lenses must be cleaned with a dry cloth. During a humidity alarm, camera lenses may be cleaned in the preparation room." },
  { name: "humidity-vents.md", text: "If a humidity alarm sounds, attendants must close the roof vents. Attendants may reopen the vents after the conservator gives clearance." },
  { name: "current-crates.md", text: "The current transport standard requires foam inserts for instrument crates. Staff must inspect each crate before dispatch." },
  { name: "legacy-crates.md", text: "The legacy transport standard prohibits foam inserts for instrument crates. Staff must inspect each crate before dispatch." },
  { name: "pilot-crates.md", text: "The pilot transport standard allows foam inserts for instrument crates after an inspection." },
  { name: "directory.md", text: "The maintenance directory lists lens cases and replacement cloths. Staff must lock the directory cabinet after closing." },
  { name: "lens-case.md", text: "Camera lens cases must be tagged before loading. Keep the tag visible when the case is closed." },
] as const;

export const scopePositionCases: readonly QueryScopeCase[] = [
  { id: "position-trigger-only", family: "subject-and-condition", query: "Implement humidity alarm logging using company humidity alarm policy.", sources: ["humidity-log.md"] },
  { id: "position-exception-request", family: "subject-and-condition", query: "Explain the camera lens cleaning exception during a humidity alarm.", sources: ["lens-cleaning.md"] },
  { id: "position-fronted-condition", family: "subject-and-condition", query: "Apply the roof vent closure requirement during a humidity alarm.", sources: ["humidity-vents.md"] },
  { id: "position-clearance", family: "subject-and-condition", query: "Explain the conservator's clearance for reopening the roof vents.", sources: ["humidity-vents.md"] },
  { id: "position-condition-and-subject", family: "subject-and-condition", query: "Explain humidity alarm logging and the camera lens cleaning exception.", sources: ["humidity-log.md", "lens-cleaning.md"] },
  { id: "position-current", family: "standard-selection", query: "Apply the current transport standard for foam inserts in instrument crates.", sources: ["current-crates.md"] },
  { id: "position-legacy", family: "standard-selection", query: "Apply the legacy transport standard for foam inserts in instrument crates.", sources: ["legacy-crates.md"] },
  { id: "position-pilot", family: "standard-selection", query: "Apply the pilot transport standard for foam inserts in instrument crates.", sources: ["pilot-crates.md"] },
  { id: "position-named-comparison", family: "standard-selection", query: "Compare the current and legacy transport standards for foam inserts in instrument crates.", sources: ["current-crates.md", "legacy-crates.md"] },
  { id: "position-unnamed-comparison", family: "standard-selection", query: "Compare all transport standards for foam inserts in instrument crates.", sources: ["current-crates.md", "legacy-crates.md", "pilot-crates.md"] },
  { id: "position-obligation", family: "rule-position", query: "Explain the obligation to use foam inserts in instrument crates.", sources: ["current-crates.md"] },
  { id: "position-prohibition", family: "rule-position", query: "Enforce the prohibition on foam inserts in instrument crates.", sources: ["legacy-crates.md"] },
  { id: "position-permission", family: "rule-position", query: "Explain the permission to use foam inserts in instrument crates.", sources: ["pilot-crates.md"] },
  { id: "position-opposed-comparison", family: "rule-position", query: "Compare the requirement and the prohibition on foam inserts in instrument crates.", sources: ["current-crates.md", "legacy-crates.md"] },
  { id: "position-unbound-selector", family: "literal-and-reference", query: "Print ‘legacy transport standard’ in the header. Enforce the foam insert requirement for instrument crates.", sources: ["current-crates.md"] },
  { id: "position-index-entry", family: "literal-and-reference", query: "Use the maintenance directory's camera lens case entry as a display label.", sources: [] },
  { id: "position-index-rule", family: "literal-and-reference", query: "Enforce the directory cabinet locking requirement.", sources: ["directory.md"] },
  { id: "position-listed-policy", family: "literal-and-reference", query: "The maintenance directory lists lens cases. Enforce the tag rule for camera lens cases.", sources: ["lens-case.md"] },
];
