import { localBindingCases } from "./local-bindings-cases.js";
import type { QueryScopeCase } from "./query-scope-cases.js";

// Authored alongside the hypothesis; diagnostic counterexamples, not held out.
export const clauseBindingCounterexamples: readonly QueryScopeCase[] = [
  { id: "clause-nested-mixed", family: "clause-mixed", query: "Sort solve(parse(request)), then implement solve(refund) according to company documents.", sources: ["refunds.md"] },
  { id: "clause-conjoined-mixed", family: "clause-mixed", query: "Sort numeric arrays in solve(request) and implement solve(refund).", sources: ["refunds.md"] },
  { id: "clause-reversed-mixed", family: "clause-mixed", query: "Implement solve(refund) and sort numeric arrays using telemetry(values).", sources: ["refunds.md"] },
  { id: "clause-quoted-local-call", family: "clause-binding", query: "Sort numeric arrays using `refund(values)`.", sources: [] },
  { id: "clause-quoted-variable-mixed", family: "clause-mixed", query: "Sort numeric values in the variable named `refund`, then implement solve(access).", sources: ["access.md"] },
  { id: "clause-company-sort", family: "clause-policy-sort", query: "Sort customer records in solve(export) according to company documents.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "clause-prose-sort", family: "clause-policy-sort", query: "Sort customer refund requests according to company documents.", sources: ["refunds.md"] },
  { id: "clause-trailing-company", family: "clause-trailing-qualification", query: "Sort customer records in solve(export), following company documents.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "clause-trailing-isolated", family: "clause-trailing-qualification", query: "Sort results in solve(export), following company documents.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "clause-negated-only", family: "clause-negation", query: "Do not sort solve(request); leave it unchanged.", sources: [] },
  { id: "clause-negated-policy-separated", family: "clause-negation", query: "Do not consult company policy; sort numeric arrays in solve(request).", sources: [] },
  { id: "clause-negated-policy-same", family: "clause-negation", query: "Sort numeric arrays in solve(request) without consulting company policy.", sources: [] },
  { id: "clause-adverb-negation", family: "clause-negation", query: "Do not merely sort solve(refund); implement eligibility according to company documents.", sources: ["refunds.md"] },
  { id: "clause-literal-punctuation", family: "clause-literal", query: "Render the literal text 'Sort solve(refund); then implement solve(telemetry)' inside a CSS panel.", sources: [] },
  { id: "clause-active-quoted", family: "clause-active-subject", query: "Implement company defaults for `refund` with numeric eligibility limits.", sources: ["refunds.md"] },
  { id: "clause-nested-quoted-argument", family: "clause-binding", query: "Sort numeric arrays using refund(parse('request; then implement telemetry')).", sources: [] },
  { id: "clause-apostrophe", family: "clause-mixed", query: "Don't deduplicate solve(refund); implement eligibility according to company documents.", sources: ["refunds.md"] },
];

export const clauseBindingCases: readonly QueryScopeCase[] = [...localBindingCases, ...clauseBindingCounterexamples];
