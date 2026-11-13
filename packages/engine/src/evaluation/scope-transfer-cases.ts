import type { QueryScopeCase } from "./query-scope-cases.js";

// Freeze before running candidates. New synthetic domains and documents test
// transfer beyond the cumulative diagnostic corpus. This is author-defined
// validation, not an independent reviewer or an unseen statistical sample.
export const scopeTransferDocuments = [
  { name: "retention.md", text: "Customer archives expire ninety days after closure. Archives under a legal hold must never be deleted until the hold is released." },
  { name: "upload.md", text: "Upload defaults permit files up to ten mebibytes. An approved operator may upload a file up to twenty mebibytes; larger files are always rejected." },
  { name: "guest.md", text: "Guest credentials expire twenty-four hours after issuance. A guest credential cannot be renewed; a new invitation is required." },
  { name: "current-deployment.md", text: "Operators may deploy customer workloads on Friday under the current release standard." },
  { name: "legacy-deployment.md", text: "Operators must not deploy customer workloads on Friday under the legacy release standard." },
  { name: "editorial.md", text: "Editorial examples use clear wording and short sentences. This writing reference does not define archive retention or upload limits." },
  { name: "calendar.md", text: "Equipment reservations run through the office calendar. This scheduling reference does not define customer permissions or guest credentials." },
  { name: "notifications.md", text: "Notification defaults disable promotional messages. Transactional messages remain enabled unless the account is suspended." },
] as const;

// Whole-domain requests require every sentence of the named policy, including
// exceptions and opposing requirements. Local implementation tasks need none.
export const scopeTransferCases: readonly QueryScopeCase[] = [
  { id: "transfer-retention-prose", family: "new-domain", query: "Summarize company archive retention requirements, including legal holds.", sources: ["retention.md"] },
  { id: "transfer-upload-code", family: "code-subject", query: "Use company policy to implement solve(upload).", sources: ["upload.md"] },
  { id: "transfer-guest-code-name", family: "code-subject", query: "Implement guest(credential) expiration and renewal according to company documents.", sources: ["guest.md"] },
  { id: "transfer-notification-prose", family: "new-domain", query: "Implement notification defaults with every exception.", sources: ["notifications.md"] },
  { id: "transfer-deployment-opposition", family: "opposing-policy", query: "Implement Friday deployment for customer workloads; preserve both current and legacy release standards.", sources: ["current-deployment.md", "legacy-deployment.md"] },
  { id: "transfer-deployment-code", family: "opposing-policy", query: "Use company policy to implement solve(deploy). Preserve opposing requirements.", sources: ["current-deployment.md", "legacy-deployment.md"] },
  { id: "transfer-mixed-local", family: "mixed-task", query: "Sort solve(request), then implement company guest credential requirements.", sources: ["guest.md"] },
  { id: "transfer-trailing", family: "trailing-qualification", query: "Sort solve(upload), as required by company documents.", sources: ["upload.md"] },
  { id: "transfer-distant", family: "replacement-intent", query: "Do not sort solve(upload). Keep the existing API. Implement size limits according to company documents.", sources: ["upload.md"] },
  { id: "transfer-negated-lookup", family: "negated-lookup", query: "Do not consult company policy; implement solve(guest) with expiration and renewal requirements.", sources: ["guest.md"] },
  { id: "transfer-negative-rule", family: "negative-policy", query: "Implement the company rule that guest credentials cannot be renewed, including their expiration.", sources: ["guest.md"] },
  { id: "transfer-generic-defaults", family: "generic-subject", query: "Summarize all company defaults.", sources: ["upload.md", "notifications.md"] },
  { id: "transfer-writing-use", family: "generic-subject", query: "What wording and sentences do editorial examples use?", sources: ["editorial.md"] },
  { id: "transfer-calendar-through", family: "generic-subject", query: "Explain the equipment reservation calendar reference.", sources: ["calendar.md"] },
  { id: "transfer-quoted-active", family: "quoted-subject", query: "Implement company requirements for `upload` with all exceptions.", sources: ["upload.md"] },
  { id: "transfer-local-negation-policy", family: "replacement-intent", query: "Never just sort solve(guest); implement expiration and renewal according to company documents.", sources: ["guest.md"] },
  { id: "transfer-two-domains", family: "multiple-policy", query: "Implement company upload and notification defaults, including exceptions.", sources: ["upload.md", "notifications.md"] },
  { id: "transfer-local-argument", family: "local-control", query: "Sort numeric arrays through solve(guest). Preserve ascending order.", sources: [] },
  { id: "transfer-local-function", family: "local-control", query: "Deduplicate upload(values); preserve numeric ordering.", sources: [] },
  { id: "transfer-local-css", family: "local-control", query: "Set the CSS width of the guest panel to 640 pixels.", sources: [] },
  { id: "transfer-local-chart", family: "prose-control", query: "Plot archive retention observations from a local CSV; do not consult company policy.", sources: [] },
  { id: "transfer-incidental-policy", family: "incidental-cue", query: "The test file is named policy. Sort solve(upload) numerically.", sources: [] },
  { id: "transfer-literal", family: "quoted-control", query: "Render the literal string 'company upload defaults' in a heading.", sources: [] },
  { id: "transfer-without-lookup", family: "negated-lookup", query: "Without consulting company documents, sort solve(guest).", sources: [] },
  { id: "transfer-local-replacement", family: "replacement-intent", query: "Do not sort solve(guest); implement a numeric comparator according to company documents.", sources: [] },
  { id: "transfer-unrelated-followup", family: "trailing-association", query: "Sort solve(upload). Follow company documents for indentation.", sources: [] },
  { id: "transfer-malformed-local", family: "malformed-control", query: "Sort numeric arrays using solve(guest", sources: [] },
  { id: "transfer-plain-numbers", family: "clean-control", query: "Sort unique finite numbers in ascending numeric order.", sources: [] },
  { id: "transfer-variable", family: "local-control", query: "Deduplicate numeric values in the variable named notifications.", sources: [] },
  { id: "transfer-negated-local", family: "negated-local", query: "Never deduplicate guest(values); preserve the input.", sources: [] },
];
