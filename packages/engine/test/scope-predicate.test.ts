import { expect, it } from "vitest";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { scopePredicateCases, scopePredicateDocuments } from "../src/evaluation/scope-predicate-cases.js";
import { subjectAdmission } from "../src/evaluation/scope-subject.js";

function admission(id: string, arm: "action" | "predicate" = "predicate") {
  const scenario = scopePredicateCases.find((item) => item.id === id)!;
  return subjectAdmission(scenario.query, scopePredicateDocuments, arm);
}

it("distributes a shared object across governing verbs and retains separate explicit objects", () => {
  expect(admission("second-predicate", "action").admitted).toEqual([]);
  expect(admission("second-predicate").admitted).toEqual(["maintenance.md"]);
  expect(admission("shared-object-source").admitted).toEqual(["cabinet-drill.md"]);
  expect(admission("second-object-mismatch").admitted).toEqual([]);
});

it("uses an action alias only for the matching object and governing position", () => {
  expect(admission("synonymous-action").clauses[0]?.action_bindings?.[0]).toMatchObject({
    verb: "document", object: ["award", "nomination"], matched_by: "verb-alias-and-object",
    assertions: [{ source: "award-log.md" }],
  });
  expect(admission("paraphrase-object-mismatch").admitted).toEqual([]);
  expect(admission("different-action").admitted).toEqual([]);
});

it("selects the requested trigger and keeps competing rules for an unqualified request", () => {
  expect(admission("condition-unless").clauses[0]?.action_bindings?.[0]).toMatchObject({
    requested_triggers: [{ marker: "unless", terms: ["cargo", "manifest", "is", "missing"] }],
    trigger_selection: "matched", assertions: [{ source: "cargo-release.md" }],
  });
  expect(admission("condition-unqualified").admitted).toEqual(["cabinet-drill.md", "cabinet-cleaning.md"]);
  expect(admission("condition-unsupported").admitted).toEqual([]);
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-predicate", "--candidate", "scope-predicate"]).candidate)
    .toBe("scope-predicate");
});
