import { clauseBindingCases } from "./clause-bindings-cases.js";
import type { QueryScopeCase } from "./query-scope-cases.js";

// Diagnostic cases for the next hypothesis, not independent/held-out validation.
// Retain expected sources even when the candidate cannot infer the association.
export const qualifiedBindingCounterexamples: readonly QueryScopeCase[] = [
  { id: "qualified-trailing-under", family: "trailing-qualification", query: "Sort results in solve(export), under company requirements.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "qualified-trailing-according", family: "trailing-qualification", query: "Deduplicate solve(access), according to company documents.", sources: ["access.md"] },
  { id: "qualified-mixed-trailing", family: "trailing-association", query: "Sort solve(request), then sort solve(export), following company documents.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "qualified-trailing-required", family: "trailing-qualification", query: "Sort solve(export), as required by company documents.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "qualified-adverb-never", family: "replacement-intent", query: "Never just sort solve(refund); implement eligibility according to company documents.", sources: ["refunds.md"] },
  { id: "qualified-implicit-replacement", family: "replacement-intent", query: "Do not merely sort solve(refund); implement eligibility and exceptions.", sources: ["refunds.md"] },
  { id: "qualified-negated-lookup-positive", family: "negated-lookup", query: "Do not consult company policy; implement solve(refund) with eligibility and exceptions.", sources: ["refunds.md"] },
  { id: "qualified-distant-antecedent", family: "replacement-intent", query: "Do not sort solve(refund). Keep the existing API. Implement eligibility according to company documents.", sources: ["refunds.md"] },
  { id: "qualified-negated-local-only", family: "negated-local", query: "Never deduplicate refund(values); preserve the input.", sources: [] },
  { id: "qualified-adverb-local-only", family: "negated-local", query: "Do not merely sort solve(request); leave it alone.", sources: [] },
  { id: "qualified-without-lookup", family: "negated-lookup", query: "Sort solve(request) without consulting company documents.", sources: [] },
  { id: "qualified-prefix-without", family: "negated-lookup", query: "Without consulting company policy, sort solve(request).", sources: [] },
  { id: "qualified-local-followup", family: "replacement-intent", query: "Do not sort solve(request); implement a numeric comparator according to company documents.", sources: [] },
  { id: "qualified-separate-lookup", family: "trailing-association", query: "Sort solve(request). Follow company documents for formatting.", sources: [] },
  { id: "qualified-quoted-qualification", family: "quoted-qualification", query: "Sort solve(request), following the literal string 'company policy'.", sources: [] },
  { id: "qualified-negated-qualification", family: "negated-lookup", query: "Sort solve(request), without following company documents.", sources: [] },
];

export const qualifiedBindingCases: readonly QueryScopeCase[] = [...clauseBindingCases, ...qualifiedBindingCounterexamples];
