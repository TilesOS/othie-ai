import { expect, it } from "vitest";
import { missingEvidencePatterns, missingPatterns } from "../src/evaluation/model-quality.js";
import { qualityCases } from "../src/evaluation/quality-cases.js";

it("detects lost qualifiers and numeric boundaries instead of scoring source presence alone", () => {
  const receipts = qualityCases.find((scenario) => scenario.id === "receipt-boundary")!;
  expect(missingPatterns("Receipts are required for expenses over $25. Exactly $25 or less is optional. A lost receipt requires a written explanation.", receipts.patterns)).toEqual([]);
  expect(missingPatterns("Receipts are required for expenses. Lost receipt requires explanation.", receipts.patterns)).toContain("written explanation");
  const consent = qualityCases.find((scenario) => scenario.id === "consent-negation")!;
  expect(missingPatterns("EU telemetry enabled with explicit consent. Missing consent is invalid. Outside the EU consent false.", consent.patterns)).toContain("must not|disabled|disable|cannot");
});

it("requires qualifiers in the expected source and whole numeric words", () => {
  const rule = { id: "r1", text: "Contractors receive written guidance twenty times per calendar year. Unused days do not carry over.",
    scope: "contractors", category: "leave", authority: 80, citation: { source: "s1/leave.md", at: "lines 1-1" } };
  const extra = { ...rule, id: "r2", text: "Employees receive ten days.", citation: { source: "s1/other.md", at: "lines 1-1" } };
  const scenario = qualityCases.find((scenario) => scenario.id === "contractor-exception")!;
  expect(missingEvidencePatterns([rule, extra], scenario.patterns, scenario.sources)).toEqual(["\\b(?:ten|10)\\b"]);
  expect(missingEvidencePatterns([extra], ["ten"], ["other.md"])).toEqual([]);
});

it("does not use generated labels to rescue missing policy evidence", () => {
  const patterns = ["written approval", "medical"];
  const rule = { id: "r1", text: "Employees may book business class.", scope: "Only with written approval; medical exception",
    category: "medical", authority: 80, citation: { source: "s1/travel.md", at: "lines 1-1", quote: "Employees may book business class." } };
  expect(missingEvidencePatterns([rule], patterns)).toEqual(patterns);
  expect(missingEvidencePatterns([{ ...rule, citation: { ...rule.citation, quote: "Written approval is required except with a medical accommodation." } }], patterns)).toEqual([]);
});
