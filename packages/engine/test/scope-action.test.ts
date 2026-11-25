import { expect, it } from "vitest";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { scopeActionCases, scopeActionDocuments } from "../src/evaluation/scope-action-cases.js";
import { scopePositionCases, scopePositionDocuments } from "../src/evaluation/scope-position-cases.js";
import { scopeRequestCases, scopeRequestDocuments } from "../src/evaluation/scope-request-cases.js";
import { subjectAdmission } from "../src/evaluation/scope-subject.js";

it("binds an inflected action to its object across active and passive wording", () => {
  const query = scopeActionCases.find(({ id }) => id === "action-passive")!.query;
  const result = subjectAdmission(query, scopeActionDocuments, "action");
  expect(result.admitted).toEqual(["badge-print.md"]);
  expect(result.clauses[0]?.action_bindings?.[0]).toMatchObject({
    verb: "print", object: ["visitor", "badge"], matched_by: "action-and-object",
    assertions: [{ source: "badge-print.md", text: scopeActionDocuments[1].text }],
  });
});

it("requires the requested action, object and position in the same assertion", () => {
  for (const id of ["action-unsupported-combination", "action-unsupported-object", "action-unsupported-position"]) {
    const query = scopeActionCases.find((scenario) => scenario.id === id)!.query;
    const result = subjectAdmission(query, scopeActionDocuments, "action");
    expect(result.admitted).toEqual([]);
    expect(result.clauses[0]?.action_bindings?.[0]?.assertions).toEqual([]);
  }
});

it("handles the compound exception and dispatch-log regressions from the position arm", () => {
  const compound = scopePositionCases.find(({ id }) => id === "position-condition-and-subject")!;
  const dispatch = scopeRequestCases.find(({ id }) => id === "request-disclaimer-boundary")!;
  expect(subjectAdmission(compound.query, scopePositionDocuments, "action").admitted).toEqual(compound.sources);
  expect(subjectAdmission(dispatch.query, scopeRequestDocuments, "action").admitted).toEqual(dispatch.sources);
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-action", "--candidate", "scope-action"]).candidate).toBe("scope-action");
});
