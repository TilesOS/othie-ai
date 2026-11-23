import { expect, it } from "vitest";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { requestAdmission } from "../src/evaluation/scope-request.js";

const documents = [
  { name: "storage.md", text: "The library requires locked storage for manuscripts." },
  { name: "copies.md", text: "The archive prohibits overnight scanning of negatives." },
  { name: "review.md", text: "The archive allows overnight scanning of negatives during review." },
  { name: "index.md", text: "The index lists storage and scanning." },
];

it("isolates active requests from literal data and local mentions", () => {
  const query = "Print the message ‘Check scanning; apply the company policy.’ in a tooltip. Apply company storage policy for manuscripts; the local fixture also mentions scanning.";
  const result = requestAdmission(query, documents, true);
  expect(result.clauses.map(({ decision }) => decision)).toEqual(["literal", "request", "mention"]);
  expect(result.admitted).toEqual(["storage.md"]);
  expect(requestAdmission("Enforce the ‘overnight scanning’ rules.", documents, true).admitted).toEqual(["copies.md", "review.md"]);
});

it("resolves an explicit ordinal and keeps an independent request after deferral", () => {
  const preamble = "Do not sort read(manuscripts) or read(negatives). Keep the public interface. ";
  const selected = requestAdmission(`${preamble}Apply the first call's handling rules under company policy.`, documents, false);
  expect(selected.clauses.at(-1)?.required).toEqual(["manuscripts"]);
  expect(selected.admitted).toEqual(["storage.md"]);
  const separate = requestAdmission("Do not sort read(manuscripts). Apply its storage requirements under company policy. Apply overnight scanning requirements under company policy.", documents, true);
  expect(separate.clauses.map(({ admitted }) => admitted)).toEqual([[], ["storage.md"], ["copies.md", "review.md"]]);
  const deferred = requestAdmission(`${preamble}Ask which call to update before applying company policy. Enforce both standards for overnight scanning.`, documents, true);
  expect(deferred.clauses.map(({ decision }) => decision)).toEqual(["local", "local", "deferred", "request"]);
  expect(deferred.admitted).toEqual(["copies.md", "review.md"]);
});

it("retains evidence independently per clause and gates the opt-in candidate", () => {
  const query = "Apply storage requirements for manuscripts. Also enforce the overnight scanning requirements.";
  const result = requestAdmission(query, documents, true);
  expect(result.clauses.map(({ admitted }) => admitted)).toEqual([["storage.md"], ["copies.md", "review.md"]]);
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-request", "--candidate", "scope-request"]).corpus).toBe("scope-request");
  expect(() => queryScopeOptions(["--out", "x", "--candidate", "scope-request"])).toThrow("scope-request requires");
});
