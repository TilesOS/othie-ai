import { expect, it } from "vitest";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { subjectAdmission } from "../src/evaluation/scope-subject.js";

const documents = [
  { name: "student.md", text: "Student permits must expire before enrollment ends. A dean may approve an extension." },
  { name: "staff.md", text: "Staff permits must expire before employment ends. A manager may approve an extension." },
  { name: "index.md", text: "The permit index lists student permits and staff permits. Administrators must lock the records cabinet overnight." },
];

it("binds both modifiers of a shared head and excludes descriptive sentence matches", () => {
  expect(subjectAdmission("Explain expiration for student permits.", documents).admitted).toEqual(["student.md"]);
  const result = subjectAdmission("Explain expiration for student and staff permits.", documents);
  expect(result.admitted).toEqual(["student.md", "staff.md"]);
  expect(result.clauses[0]?.descriptive_matches.map(({ source }) => source)).toEqual(["index.md"]);
  expect(subjectAdmission("Apply the records cabinet requirement.", documents).admitted).toEqual(["index.md"]);
});

it("carries a single implicit call subject and defers an unselected alternative", () => {
  const selected = subjectAdmission("Do not sort read(student); implement extension eligibility.", documents);
  expect(selected.clauses.at(-1)?.required).toEqual(["student"]);
  expect(selected.admitted).toEqual(["student.md"]);
  const ambiguous = subjectAdmission("Do not sort read(student) or read(staff); implement extension eligibility.", documents);
  expect(ambiguous.clauses.at(-1)?.decision).toBe("unresolved");
  expect(ambiguous.admitted).toEqual([]);
});

it("keeps both opposing standards in a comparison and suppresses local fixture requests", () => {
  const standards = [
    { name: "current.md", text: "The current standard requires staff to steam wool blankets before folding." },
    { name: "legacy.md", text: "The legacy standard prohibits steaming wool blankets before folding." },
  ];
  expect(subjectAdmission("Compare both standards for steaming wool blankets before folding.", standards).admitted).toEqual(["current.md", "legacy.md"]);
  expect(subjectAdmission("Compare steaming wool blankets using only the two test fixtures.", standards).admitted).toEqual([]);
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-subject", "--candidate", "scope-subject"]).candidate).toBe("scope-subject");
});
