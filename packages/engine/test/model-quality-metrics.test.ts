import { expect, it } from "vitest";
import { missingPatterns } from "../src/evaluation/model-quality.js";
import { qualityCases } from "../src/evaluation/quality-cases.js";

it("detects lost qualifiers and numeric boundaries instead of scoring source presence alone", () => {
  const receipts = qualityCases.find((scenario) => scenario.id === "receipt-boundary")!;
  expect(missingPatterns("Receipts are required for expenses over $25. Exactly $25 or less is optional. A lost receipt requires a written explanation.", receipts.patterns)).toEqual([]);
  expect(missingPatterns("Receipts are required for expenses. Lost receipt requires explanation.", receipts.patterns)).toContain("written explanation");
  const consent = qualityCases.find((scenario) => scenario.id === "consent-negation")!;
  expect(missingPatterns("EU telemetry enabled with explicit consent. Missing consent is invalid. Outside the EU consent false.", consent.patterns)).toContain("must not|disabled|disable|cannot");
});
