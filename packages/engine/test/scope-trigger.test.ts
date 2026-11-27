import { expect, it } from "vitest";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { scopeTriggerCases, scopeTriggerDocuments } from "../src/evaluation/scope-trigger-cases.js";
import { subjectAdmission } from "../src/evaluation/scope-subject.js";

function admission(id: string) {
  const scenario = scopeTriggerCases.find((item) => item.id === id)!;
  return subjectAdmission(scenario.query, scopeTriggerDocuments, "trigger");
}

it("binds unfamiliar active and passive conjuncts to the correct objects", () => {
  for (const id of ["unlisted-coordinated-verb", "coordinated-passive", "distinct-active-objects",
    "active-object-crossing", "coordinated-objects", "passive-shared-object", "passive-unrelated-object"]) {
    expect(admission(id).admitted, id).toEqual(scopeTriggerCases.find((item) => item.id === id)!.sources);
  }
});

it("distinguishes a conflicting trigger from an unconfirmed one", () => {
  expect(admission("single-source-conflicting-trigger").clauses[0]?.action_bindings?.[0]).toMatchObject({
    assertions: [], trigger_candidates: [{ source: "blue-cabinet.md", status: "contradicted" }],
  });
  expect(admission("unsupported-paraphrase").clauses[0]?.action_bindings?.[0]).toMatchObject({
    assertions: [], trigger_candidates: [{ source: "blue-cabinet.md", status: "unconfirmed" }],
  });
  expect(admission("paraphrased-trigger").admitted).toEqual(["white-cabinet-cleaning.md"]);
  expect(admission("opposing-connector").admitted).toEqual([]);
});

it("evaluates literal and equivalent verbs under the same trigger gate", () => {
  expect(admission("literal-verb-conflicting-trigger").clauses[0]?.action_bindings?.[0]).toMatchObject({
    assertions: [{ source: "night-results.md" }],
    trigger_candidates: [
      { source: "daily-results.md", status: "unconfirmed", matched_by: "action-and-object" },
      { source: "night-results.md", status: "matched", matched_by: "verb-alias-and-object" },
    ],
  });
  expect(admission("unqualified-action").admitted.toSorted()).toEqual(["white-cabinet-cleaning.md", "white-cabinet-shift.md"]);
  expect(admission("named-opposing-standards").admitted.toSorted()).toEqual(["tray-current.md", "tray-pilot.md"]);
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-trigger", "--candidate", "scope-trigger"]).candidate)
    .toBe("scope-trigger");
});
