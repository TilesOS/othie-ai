import { policyGuardCases } from "./policy-guard-cases.js";
import type { QueryScopeCase } from "./query-scope-cases.js";

// Diagnostic extension, authored with the hypothesis, not a held-out benchmark.
export const localBindingCounterexamples: readonly QueryScopeCase[] = [
  { id: "local-refund-name", family: "local-binding", query: "Sort numeric values in the variable named refund.", sources: [] },
  { id: "local-consent-name", family: "local-binding", query: "Deduplicate the variable called consent.", sources: [] },
  { id: "local-access-panel", family: "local-layout", query: "Change the CSS width of the access panel.", sources: [] },
  { id: "local-telemetry-literal", family: "local-literal", query: "Render the literal text 'telemetry consent' inside a CSS panel.", sources: [] },
  { id: "mixed-separated-refund", family: "mixed-binding-policy", query: "Sort numeric values in solve(request). Implement solve(refund) according to company documents.", sources: ["refunds.md"] },
  { id: "mixed-same-sentence-refund", family: "mixed-binding-policy", query: "Sort numeric values in solve(request), then implement solve(refund) according to company documents.", sources: ["refunds.md"] },
  { id: "policy-numeric-refund", family: "policy-with-local-cue", query: "Implement solve(refund) with numeric eligibility limits according to company documents.", sources: ["refunds.md"] },
  { id: "policy-sort-export", family: "policy-with-local-cue", query: "Sort customer records in solve(export) according to both company export requirements.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "quoted-active-access", family: "active-quoted-subject", query: "Implement company defaults for `access` including expiration and extensions.", sources: ["access.md"] },
  { id: "negated-local-refund", family: "negated-local-operation", query: "Do not sort solve(refund); implement eligibility according to company documents.", sources: ["refunds.md"] },
  { id: "local-function-name", family: "local-function-collision", query: "Sort numeric arrays using refund(values).", sources: [] },
  { id: "local-quoted-identifier", family: "local-binding", query: "Sort numeric values in the variable named `request`.", sources: [] },
];

export const localBindingCases: readonly QueryScopeCase[] = [...policyGuardCases, ...localBindingCounterexamples];
