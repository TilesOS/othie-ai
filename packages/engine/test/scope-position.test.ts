import { expect, it } from "vitest";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { subjectAdmission } from "../src/evaluation/scope-subject.js";

const documents = [
  { name: "generator.md", text: "The operator must log generator failures before closing." },
  { name: "refrigerator.md", text: "During a generator failure, staff must inspect the vaccine refrigerator." },
  { name: "current.md", text: "The current storage standard requires paper sleeves for glass negatives." },
  { name: "legacy.md", text: "The legacy storage standard prohibits paper sleeves for glass negatives." },
  { name: "pilot.md", text: "The pilot storage standard allows paper sleeves for glass negatives." },
];

it("binds a requested position to the same assertion as the policy subject", () => {
  expect(subjectAdmission("Enforce the prohibition on paper sleeves for glass negatives.", documents, true).admitted).toEqual(["legacy.md"]);
  expect(subjectAdmission("Explain the permission to use paper sleeves for glass negatives.", documents, true).admitted).toEqual(["pilot.md"]);
  expect(subjectAdmission("Compare the current and legacy storage standards for paper sleeves for glass negatives.", documents, true).admitted)
    .toEqual(["current.md", "legacy.md"]);
  expect(subjectAdmission("Compare all storage standards for paper sleeves for glass negatives.", documents, true).admitted)
    .toEqual(["current.md", "legacy.md", "pilot.md"]);
});

it("distinguishes a condition-only hit from a request for the underlying rule", () => {
  expect(subjectAdmission("Implement generator failure logging using company generator failure policy.", documents, true).admitted)
    .toEqual(["generator.md"]);
  expect(subjectAdmission("Apply the vaccine refrigerator inspection requirement during a generator failure.", documents, true).admitted)
    .toEqual(["refrigerator.md"]);
});

it("ignores a descriptive label and allows an operative rule in the same document", () => {
  const withDirectory = [...documents,
    { name: "directory.md", text: "The catalog directory lists sleeves. Staff must lock the catalog cabinet after closing." }];
  expect(subjectAdmission("Use the catalog directory's glass negatives entry as a display label.", withDirectory, true).admitted).toEqual([]);
  expect(subjectAdmission("Apply the catalog cabinet locking requirement.", withDirectory, true).admitted).toEqual(["directory.md"]);
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-position", "--candidate", "scope-position"]).candidate).toBe("scope-position");
});
