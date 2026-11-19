import { expect, it } from "vitest";
import { assertionSubjectTerms, isScopeDisclaimer, scopeAssertions } from "../src/evaluation/assertion-subject.js";

it("distinguishes scope disclaimers from prohibitions and mixed assertions", () => {
  expect(isScopeDisclaimer("This filing guide does not cover account recovery.")).toBe(true);
  expect(isScopeDisclaimer("These manuals do not address incident review.")).toBe(true);
  expect(isScopeDisclaimer("Members must not share recovery codes.")).toBe(false);
  expect(isScopeDisclaimer("The policy does not permit account recovery.")).toBe(false);
  expect(isScopeDisclaimer("This guide does not define account recovery, but it requires a witness.")).toBe(false);
  expect(isScopeDisclaimer("This guide does not define account recovery and requires a witness.")).toBe(false);
});

it("keeps independent assertions for terms which also occur in a disclaimer", () => {
  expect(scopeAssertions(["witness", "recovery"], [
    { name: "first.md", text: "This filing guide does not cover account recovery. Witnesses must sign the record." },
    { name: "second.md", text: "This guide does not specify witness duties. A witness must sign after recovery." },
  ])).toEqual([
    { source: "first.md", asserted_terms: [], disclaimer_terms: ["recovery"] },
    { source: "second.md", asserted_terms: ["witness", "recovery"], disclaimer_terms: ["witness"] },
  ]);
});

it("drops scaffolding in a matched construction and preserves standalone subjects", () => {
  expect(assertionSubjectTerms("Use company policy to implement solve(archive).")).toContain("archive");
  expect(assertionSubjectTerms("Use company policy to implement solve(archive).")).not.toContain("use");
  expect(assertionSubjectTerms("Explain proper use of the filing guide.")).toContain("use");
  expect(assertionSubjectTerms("Sort numeric values through solve(archive).")).not.toContain("through");
  expect(assertionSubjectTerms("Which roads run through the park?")).toContain("through");
  expect(assertionSubjectTerms("Implement invoice defaults.")).not.toContain("defaults");
  expect(assertionSubjectTerms("Implement company defaults for `archive`.")).toContain("archive");
  expect(assertionSubjectTerms("Implement company defaults for `archive`.")).not.toContain("defaults");
  expect(assertionSubjectTerms("Review invoice defaults. List all company defaults.")).toContain("defaults");
});

it("attaches a trailing company qualification to its immediate call", () => {
  expect(assertionSubjectTerms("Sort solve(archive), as required by company documents.")).toContain("archive");
  expect(assertionSubjectTerms("Sort solve(archive). Use company documents for indentation.")).not.toContain("archive");
});
