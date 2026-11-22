import type { QueryScopeCase } from "./query-scope-cases.js";

// Frozen before the reference candidate runs. These synthetic fixtures are
// authored for the new failure modes and still require independent review.
export const scopeReferenceDocuments = [
  { name: "lab-calibration.md", text: "Laboratory calibration certificates require a technician's signature before release. Field repairs may proceed without a signed certificate during an outage." },
  { name: "vendor-certificates.md", text: "Vendor certificates require an auditor's signature before release. An unsigned certificate may be stored for review, but must not be released." },
  { name: "loan-policy.md", text: "Instrument loans expire at the end of the booking. A borrower may renew once unless the instrument has a pending reservation." },
  { name: "grant-policy.md", text: "Research grants expire at the end of the fiscal cycle. An awardee must seek written permission before spending after expiration." },
  { name: "primary-disposal.md", text: "Under the current inventory standard, staff must discard empty sample containers after inspection." },
  { name: "legacy-disposal.md", text: "Under the legacy inventory standard, staff must never discard empty sample containers before an audit." },
  { name: "incident-desk.md", text: "Staff must log each outage through the incident desk before contacting a field technician. The incident desk guide does not define instrument loans or calibration requirements." },
  { name: "inventory-reports.md", text: "The weekly inventory report lists laboratory instruments, vendor names, and empty container counts." },
] as const;

export const scopeReferenceCases: readonly QueryScopeCase[] = [
  { id: "ref-calibration-distant", family: "distant-reference", query: "Do not sort check(calibration). Keep the public signature. Apply its signing requirements according to company documents.", sources: ["lab-calibration.md"] },
  { id: "ref-loan-distant", family: "distant-reference", query: "Never just deduplicate check(loans). Preserve the existing interface. Implement the renewal exception under company policy.", sources: ["loan-policy.md"] },
  { id: "ref-local-replacement", family: "local-replacement", query: "Do not sort check(loans). Keep the public signature. Implement a stable numeric comparator according to company documents.", sources: [] },
  { id: "ref-local-indentation", family: "local-replacement", query: "Never just sort check(calibration); apply indentation rules according to company documents.", sources: [] },
  { id: "ref-extra-subject", family: "multiple-policy", query: "Summarize instrument loans and the research grants expiration rule.", sources: ["grant-policy.md", "loan-policy.md"] },
  { id: "ref-opposition", family: "opposing-policy", query: "Implement inventory sample disposal under both standards, including their conflicting instructions for empty containers.", sources: ["legacy-disposal.md", "primary-disposal.md"] },
  { id: "ref-opposition-code", family: "opposing-policy", query: "Use company documents to implement check(discard) for both standards.", sources: ["legacy-disposal.md", "primary-disposal.md"] },
  { id: "ref-explicit-topic", family: "explicit-scope", query: "Repair the release check using company calibration policy. The stub mentions certificates, vendors, and incident reports.", sources: ["lab-calibration.md"] },
  { id: "ref-explicit-and-separate", family: "multiple-policy", query: "Repair the release check using company calibration policy. Also implement the research grants expiration rule.", sources: ["grant-policy.md", "lab-calibration.md"] },
  { id: "ref-output-name", family: "local-replacement", query: "Do not sort check(grants). Keep the public signature. Implement alphabetical ordering according to company documents.", sources: [] },
  { id: "ref-shared-only", family: "generic-subject", query: "Which certificates require a signature before release?", sources: ["lab-calibration.md", "vendor-certificates.md"] },
  { id: "ref-subset-source", family: "generic-subject", query: "Compare certificate release after signing and the calibration field-repair exception.", sources: ["lab-calibration.md", "vendor-certificates.md"] },
  { id: "ref-negative-rule", family: "negative-policy", query: "Implement the prohibition on release of unsigned vendor certificates, including what can be stored.", sources: ["vendor-certificates.md"] },
  { id: "ref-reference-replaced", family: "competing-reference", query: "Do not sort check(loans). Switch to check(grants). Implement its expiration rules according to company documents.", sources: ["grant-policy.md"] },
  { id: "ref-reference-ambiguous", family: "competing-reference", query: "Do not sort check(loans) or check(grants). Keep the existing API. Ask which interface to update before applying company policy.", sources: [] },
  { id: "ref-disclaimer", family: "negative-policy", query: "Summarize what the incident desk requires during an outage.", sources: ["incident-desk.md"] },
  { id: "ref-local-data", family: "local-control", query: "Plot laboratory calibration results from last week's local sample data.", sources: [] },
  { id: "ref-malformed", family: "local-control", query: "Deduplicate instrument rows in check(loans,", sources: [] },
  { id: "ref-quoted", family: "local-control", query: "Render the literal string 'using company vendor policy' in the dialog.", sources: [] },
  { id: "ref-negated-scope", family: "local-control", query: "Repair the bar chart without using company calibration policy. Use only the local fixture.", sources: [] },
];
