import type { QueryScopeCase } from "./query-scope-cases.js";

export const scopeContrastDocuments = [
  { name: "archive-badges.md", text: "Archive badges must be deactivated at expiration. A conservator may extend a badge for one day if an inventory review is still in progress." },
  { name: "visitor-badges.md", text: "Visitor badges must be deactivated at expiration. Security may reactivate a visitor badge only after a new identity check." },
  { name: "specimen-labels.md", text: "Specimen labels require a barcode before shipment. During an outage, a handwritten specimen label may be used if the manifest has a barcode." },
  { name: "parcel-labels.md", text: "Parcel labels require a barcode before shipment. Unreadable labels must be replaced before the parcel leaves the dock." },
  { name: "current-rinse.md", text: "The current standard requires staff to rinse sample trays before inspection. Staff must discard each damaged tray." },
  { name: "legacy-rinse.md", text: "The legacy standard prohibits rinsing sample trays before inspection. Staff must set aside each damaged tray for review." },
  { name: "outage-log.md", text: "The duty officer must log every outage before notifying the dock. This guide does not set specimen labeling or badge expiration requirements." },
  { name: "report-layout.md", text: "The weekly report lists archive badges, visitor badges, specimen labels, parcel labels and sample trays in separate columns." },
] as const;

type Contrast = {
  id: string;
  context: readonly [prefix: string, suffix: string];
  variants: readonly [
    { change: string; sources: readonly string[] },
    { change: string; sources: readonly string[] },
  ];
};

// Each pair shares its surrounding text and changes only the indicated span.
// Freeze the prompts and judgments before measuring the existing strategies.
export const scopeContrasts: readonly Contrast[] = [
  {
    id: "replacement-intent",
    context: ["Do not sort read(specimen). Preserve the public interface. Implement ", " according to company documents."],
    variants: [
      { change: "its shipment exception", sources: ["specimen-labels.md"] },
      { change: "a stable numeric comparator", sources: [] },
    ],
  },
  {
    id: "antecedent-choice",
    context: ["Do not sort read(specimen) or read(parcel). Keep the existing API. ", ""],
    variants: [
      { change: "Apply the second call's shipment rule under company policy.", sources: ["parcel-labels.md"] },
      { change: "Ask which call to update before applying the shipment rule under company policy.", sources: [] },
    ],
  },
  {
    id: "call-syntax",
    context: ["Deduplicate specimen rows in ", ""],
    variants: [
      { change: "read(labels)", sources: [] },
      { change: "read(labels,", sources: [] },
    ],
  },
  {
    id: "authority",
    context: ["Implement barcode validation for specimen labels using ", "."],
    variants: [
      { change: "company specimen labeling policy", sources: ["specimen-labels.md"] },
      { change: "only the local fixture", sources: [] },
    ],
  },
  {
    id: "shared-subject",
    context: ["Explain deactivation at expiration for ", "."],
    variants: [
      { change: "archive badges", sources: ["archive-badges.md"] },
      { change: "archive and visitor badges", sources: ["archive-badges.md", "visitor-badges.md"] },
    ],
  },
  {
    id: "second-clause",
    context: ["Implement shipment validation using company specimen label policy. ", " parcel labels."],
    variants: [
      { change: "Also apply the barcode requirements for", sources: ["parcel-labels.md", "specimen-labels.md"] },
      { change: "The local test file also mentions", sources: ["specimen-labels.md"] },
    ],
  },
  {
    id: "opposing-standards",
    context: ["Compare the requirements for rinsing sample trays before inspection in ", "."],
    variants: [
      { change: "both company standards", sources: ["current-rinse.md", "legacy-rinse.md"] },
      { change: "only the two hard-coded test fixtures", sources: [] },
    ],
  },
  {
    id: "negated-lookup",
    context: ["Validate expiration for archive badges ", " company archive badge policy."],
    variants: [
      { change: "using", sources: ["archive-badges.md"] },
      { change: "without using", sources: [] },
    ],
  },
  {
    id: "quoted-reference",
    context: ["", "Implement outage logging using company outage policy."],
    variants: [
      { change: "", sources: ["outage-log.md"] },
      { change: "Print the following literal text in the dialog: ", sources: [] },
    ],
  },
] as const;

export const scopeContrastCases: readonly QueryScopeCase[] = scopeContrasts.flatMap(({ id, context: [prefix, suffix], variants }) =>
  variants.map(({ change, sources }, index) => ({ id: `${id}-${index + 1}`, family: id, query: prefix + change + suffix, sources })));
