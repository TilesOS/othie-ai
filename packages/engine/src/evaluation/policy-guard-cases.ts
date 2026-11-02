import { queryScopeCases, type QueryScopeCase } from "./query-scope-cases.js";

// Explicitly selected extension; never replace the October 29 corpus. These
// labels describe desired retrieval, not what any candidate happens to return.
export const policyGuardCounterexamples: readonly QueryScopeCase[] = [
  { id: "implicit-telemetry", family: "unguarded-policy-subject", query: "Implement solve(telemetry) with the correct consent defaults.", sources: ["telemetry.md"] },
  { id: "implicit-refund", family: "unguarded-policy-subject", query: "Implement solve(refund) with the correct eligibility and exceptions.", sources: ["refunds.md"] },
  { id: "implicit-access", family: "unguarded-policy-subject", query: "Implement solve(access) with the correct expiration and extension behavior.", sources: ["access.md"] },
  { id: "implicit-export", family: "unguarded-opposing-policy", query: "Implement solve(export) for customer records, preserving opposing requirements from the sources.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "implicit-export-no-cue", family: "unguarded-opposing-policy", query: "Implement solve(export) for customer records according to the company documents.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "guarded-multiline", family: "guarded-policy-subject", query: "Follow company policies.\nImplement solve(telemetry).", sources: ["telemetry.md"] },
  { id: "guarded-multiple-arguments", family: "guarded-policy-subject", query: "Use company policy to implement solve(telemetry, consent).", sources: ["telemetry.md"] },
  { id: "mixed-policy-and-array", family: "mixed-intent", query: "Sort numeric arrays in solve(request), and implement company telemetry defaults with consent.", sources: ["telemetry.md"] },
  { id: "policy-without-magic-word", family: "unguarded-policy-subject", query: "According to company documents, implement solve(refund).", sources: ["refunds.md"] },
  { id: "array-policy-word", family: "incidental-policy-cue", query: "Sort numeric arrays in solve(request). The ordering policy is ascending.", sources: [] },
  { id: "array-requirement-word", family: "incidental-policy-cue", query: "Sort numeric arrays in solve(request). Requirements: ascending order and unique values.", sources: [] },
  { id: "quoted-policy-cue", family: "quoted-policy-cue", query: "Sort numeric arrays in solve(request). Preserve the literal string \"company policy\" in the unit test.", sources: [] },
  { id: "negated-policy-cue", family: "negated-policy-cue", query: "Sort numeric arrays in solve(request). Do not consult company policy.", sources: [] },
  { id: "irrelevant-guarded-variable", family: "incidental-policy-cue", query: "Sort the numeric variable named request. Follow the repository policy for formatting.", sources: [] },
  { id: "requirements-css", family: "incidental-policy-cue", query: "Layout requirements: set window width to 640 pixels.", sources: [] },
  { id: "quoted-call", family: "literal-call-control", query: "Render the literal text 'solve(refund)' inside a CSS panel.", sources: [] },
  { id: "nested-array-call", family: "nested-signature-control", query: "Sort numeric arrays in solve(parse(request)). Preserve ascending order.", sources: [] },
  { id: "prose-array-identifier", family: "prose-control", query: "Sort the numeric variable named telemetry in ascending order.", sources: [] },
];

export const policyGuardCases: readonly QueryScopeCase[] = [...queryScopeCases, ...policyGuardCounterexamples];
