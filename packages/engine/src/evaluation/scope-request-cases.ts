import type { QueryScopeCase } from "./query-scope-cases.js";

// Freeze the synthetic prompts and source judgments before implementing the
// clause experiment. These judgments still require independent review.
export const scopeRequestDocuments = [
  { name: "fleet-charging.md", text: "Fleet vans must finish charging before dispatch. The dispatcher may release a van early for an emergency pickup." },
  { name: "forklift-charging.md", text: "Forklifts must finish charging before dispatch. A supervisor must inspect a forklift before releasing it after a battery fault." },
  { name: "media-retention.md", text: "Interview recordings must be deleted after 30 days. Recordings under a legal hold must be retained until the hold is lifted." },
  { name: "audit-retention.md", text: "Audit recordings must be deleted after 90 days. An investigator may request an extension before deletion." },
  { name: "cold-room.md", text: "The cold room prohibits overnight dry ice storage. The attendant must remove any remaining dry ice before closing." },
  { name: "loading-bay.md", text: "The loading bay permits overnight dry ice storage in vented bins. Staff must inspect the bins before opening." },
  { name: "dispatch-log.md", text: "Dispatchers must log vehicle faults before calling maintenance. This guide does not cover fleet charging or forklift charging." },
  { name: "index-layout.md", text: "The operations index lists fleet vans, forklifts, interview recordings, audit recordings and dry ice storage." },
] as const;

export const scopeRequestCases: readonly QueryScopeCase[] = [
  { id: "request-second-policy", family: "additional-request", query: "Check the dispatch step using company fleet charging policy. Also enforce the interview recordings retention rule.", sources: ["fleet-charging.md", "media-retention.md"] },
  { id: "request-second-mention", family: "additional-request", query: "Check the dispatch step using company fleet charging policy. The local fixture also contains the interview recordings retention rule.", sources: ["fleet-charging.md"] },
  { id: "request-second-semicolon", family: "additional-request", query: "Check the dispatch step using company fleet charging policy; separately apply audit recordings retention requirements.", sources: ["fleet-charging.md", "audit-retention.md"] },
  { id: "request-first-local", family: "additional-request", query: "Use only the local fixture to lay out the charging display. Separately apply the interview recordings deletion policy.", sources: ["media-retention.md"] },
  { id: "request-source-denied", family: "policy-negation", query: "Set up fleet van charging using the local stub without consulting company fleet charging policy.", sources: [] },
  { id: "request-prohibition", family: "policy-negation", query: "Implement the prohibition on overnight dry ice storage in the cold room.", sources: ["cold-room.md"] },
  { id: "request-both-standards", family: "policy-negation", query: "Compare the cold room and loading bay policies for overnight dry ice storage.", sources: ["cold-room.md", "loading-bay.md"] },
  { id: "request-quoted-label", family: "literal-and-reference", query: "Show the message ‘Apply the audit recordings deletion rule.’ in the mock dialog.", sources: [] },
  { id: "request-quoted-rule", family: "literal-and-reference", query: "Enforce the ‘audit recordings deletion rule’ before purging data.", sources: ["audit-retention.md"] },
  { id: "request-unquoted-literal", family: "literal-and-reference", query: "Put the following literal text in the banner: Apply company forklift charging policy.", sources: [] },
  { id: "request-literal-and-rule", family: "literal-and-reference", query: "Print 'follow forklift charging policy' in the banner. Apply the interview recordings retention exception.", sources: ["media-retention.md"] },
  { id: "request-ordinal", family: "antecedent", query: "Do not sort load(interview) or load(audit). Keep the existing API. Apply the first call's deletion rule under company policy.", sources: ["media-retention.md"] },
  { id: "request-switch", family: "antecedent", query: "Never sort load(interview). Switch to load(audit). Apply its deletion rule following company policy.", sources: ["audit-retention.md"] },
  { id: "request-deferred", family: "antecedent", query: "Do not sort load(interview) or load(audit). Ask which one to update before applying the deletion rule under company policy.", sources: [] },
  { id: "request-deferred-and-rule", family: "antecedent", query: "Do not sort load(interview) or load(audit). Ask which one to update before applying the deletion rule under company policy. Enforce the cold room prohibition on overnight dry ice storage.", sources: ["cold-room.md"] },
  { id: "request-code-subject", family: "local-operation", query: "Deduplicate forklift rows in load(charging) and keep first occurrence.", sources: [] },
  { id: "request-code-policy", family: "local-operation", query: "Deduplicate forklift rows in load(charging) according to company forklift charging policy.", sources: ["forklift-charging.md"] },
  { id: "request-disclaimer-boundary", family: "local-operation", query: "Implement the dispatch log requirement for reporting vehicle faults before maintenance.", sources: ["dispatch-log.md"] },
];
