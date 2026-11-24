import type { QueryScopeCase } from "./query-scope-cases.js";

// Freeze source judgments before evaluating any subject-binding strategy.
export const scopeSubjectDocuments = [
  { name: "press-passes.md", text: "Press passes must be collected at the news desk before noon. The newsroom may grant a late collection exception for delayed trains." },
  { name: "contractor-passes.md", text: "Contractor passes must be collected at the service desk before noon. The site manager may extend collection during a shift handoff." },
  { name: "pump.md", text: "The pump must be primed before restart. The maintenance chief may authorize a restart after a dry run only after inspecting the seal." },
  { name: "furnace.md", text: "The furnace must be purged before restart. The line operator must record the purge before relighting the burner." },
  { name: "current-film.md", text: "The current film standard requires cold storage for acetate reels. Operators must discard wet sleeves before storage." },
  { name: "legacy-film.md", text: "The legacy film standard prohibits cold storage for acetate reels. Operators must set wet sleeves aside for inspection." },
  { name: "index.md", text: "The records index lists press passes, contractor passes, pump restart, furnace restart, and film storage." },
  { name: "inventory.md", text: "The equipment index lists pump seals and burners. Operators must lock the inventory cabinet at closing." },
] as const;

export const scopeSubjectCases: readonly QueryScopeCase[] = [
  { id: "subject-single", family: "shared-head", query: "Explain collection before noon for press passes.", sources: ["press-passes.md"] },
  { id: "subject-coordinated", family: "shared-head", query: "Explain collection before noon for press and contractor passes.", sources: ["press-passes.md", "contractor-passes.md"] },
  { id: "subject-coordinated-full", family: "shared-head", query: "Explain collection before noon for press passes and contractor passes.", sources: ["press-passes.md", "contractor-passes.md"] },
  { id: "subject-bare", family: "shared-head", query: "Explain collection before noon for passes.", sources: ["press-passes.md", "contractor-passes.md"] },
  { id: "subject-independent-objects", family: "coordination", query: "Compare the pump restart exception and the furnace purge requirement.", sources: ["furnace.md", "pump.md"] },
  { id: "subject-coordinated-local", family: "coordination", query: "Explain the furnace purge requirement and print the label ‘pump restart’.", sources: ["furnace.md"] },
  { id: "subject-nested-coordination", family: "coordination", query: "Apply the pump restart rule and its dry run exception.", sources: ["pump.md"] },
  { id: "subject-implicit", family: "antecedent", query: "Do not merely sort read(press); implement collection eligibility and exceptions.", sources: ["press-passes.md"] },
  { id: "subject-implicit-local", family: "antecedent", query: "Do not merely sort read(press); implement alphabetical ordering.", sources: [] },
  { id: "subject-implicit-ambiguous", family: "antecedent", query: "Do not sort read(press) or read(contractor); implement collection eligibility and exceptions.", sources: [] },
  { id: "subject-implicit-explicit", family: "antecedent", query: "Do not sort read(press) or read(contractor); implement contractor pass collection eligibility and exceptions.", sources: ["contractor-passes.md"] },
  { id: "subject-two-standards", family: "opposing-rules", query: "Compare both standards for cold storage of acetate reels.", sources: ["current-film.md", "legacy-film.md"] },
  { id: "subject-one-standard", family: "opposing-rules", query: "Apply the current standard for cold storage of acetate reels.", sources: ["current-film.md"] },
  { id: "subject-prohibition", family: "opposing-rules", query: "Enforce the prohibition on cold storage of acetate reels.", sources: ["legacy-film.md"] },
  { id: "subject-index-only", family: "descriptive-source", query: "Implement the pump seal entry from the equipment index.", sources: [] },
  { id: "subject-mixed-source", family: "descriptive-source", query: "Apply the inventory cabinet locking requirement.", sources: ["inventory.md"] },
  { id: "subject-literal", family: "literal-and-reference", query: "Print the following literal text: Explain collection before noon for press passes.", sources: [] },
  { id: "subject-quoted-topic", family: "literal-and-reference", query: "Explain the ‘press passes’ collection requirement.", sources: ["press-passes.md"] },
];
