import { expect, it } from "vitest";
import { referenceAdmission, referenceTerms } from "../src/evaluation/scope-reference.js";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";

it("binds only a single eligible call across the supported interface bridge", () => {
  expect(referenceTerms("Do not sort `read(badges)`. Preserve the public interface. Apply expiration requirements under company policy.").carried).toEqual(["badges"]);
  expect(referenceTerms("Do not sort read(badges); implement a numeric comparator according to company documents.").carried).toEqual([]);
  expect(referenceTerms("Do not sort read(badges) or read(tokens); implement expiration requirements under company policy.").carried).toEqual([]);
});

it("restricts one explicit scope while preserving opposing sources with the same terms", () => {
  const documents = [
    { name: "a.md", text: "Employees may dispatch crates under the current standard." },
    { name: "b.md", text: "Employees must not dispatch crates under the legacy standard." },
    { name: "c.md", text: "Crates need a warehouse tag." },
  ];
  expect(referenceAdmission("Repair the check using company dispatch policy. The stub mentions crates.", documents, true).admitted).toEqual(["a.md", "b.md"]);
  expect(referenceAdmission("Repair the check using company dispatch policy. Also apply the warehouse tag requirement.", documents, true).admitted).toEqual(["a.md", "b.md", "c.md"]);
  expect(referenceAdmission("Repair the check without using company dispatch policy.", documents, true).admitted).toEqual([]);
});

it("requires an eligible corpus for the opt-in reference comparison", () => {
  expect(() => queryScopeOptions(["--out", "x", "--candidate", "scope-reference"])).toThrow("scope-reference requires");
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-reference", "--candidate", "scope-reference"]).candidate).toBe("scope-reference");
});
