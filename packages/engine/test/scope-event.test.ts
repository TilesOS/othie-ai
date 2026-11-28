import { expect, it } from "vitest";
import { queryScopeOptions } from "../src/evaluation/query-scope.js";
import { scopeEventCases, scopeEventDocuments } from "../src/evaluation/scope-event-cases.js";
import { subjectAdmission } from "../src/evaluation/scope-subject.js";

function admission(id: string) {
  const scenario = scopeEventCases.find((item) => item.id === id)!;
  return subjectAdmission(scenario.query, scopeEventDocuments, "event");
}

it("scopes each condition to its own request and assertion", () => {
  expect(admission("different-trigger-per-action").clauses[0]?.action_bindings).toMatchObject([
    { verb: "seal", requested_triggers: [{ marker: "before", terms: ["transit"] }], assertions: [{ source: "archive-crates.md" }] },
    { verb: "stamp", requested_triggers: [{ marker: "after", terms: ["transit"] }], assertions: [{ source: "cargo-labels.md" }] },
  ]);
  expect(admission("crossed-action-trigger").clauses[0]?.action_bindings).toMatchObject([
    { verb: "rinse", assertions: [], trigger_candidates: [{ status: "contradicted", triggers: [{ marker: "before", terms: ["filling"] }] }] },
    { verb: "label", assertions: [], trigger_candidates: [{ status: "contradicted", triggers: [{ marker: "after", terms: ["filling"] }] }] },
  ]);
});

it("traces nominal events to an earlier assertion in the same document", () => {
  expect(admission("ellipsis-local-antecedent").clauses[0]?.action_bindings?.[0]).toMatchObject({
    trigger_candidates: [{
      source: "ink-carts.md", status: "matched", triggers: [{ marker: "after", terms: ["replacement"] }],
      antecedents: [{ text: "Technicians must replace ink cartridges.", trigger: { marker: "after", terms: ["replace", "ink", "cartridge"] } }],
    }],
  });
  for (const id of ["ellipsis-other-source", "ellipsis-forward-reference", "ellipsis-explicit-time-conflict"]) {
    expect(admission(id).admitted, id).toEqual([]);
  }
});

it("accepts passive series and shared triggers while retaining object and event boundaries", () => {
  for (const scenario of scopeEventCases) {
    expect(admission(scenario.id).admitted.toSorted(), scenario.id).toEqual([...scenario.sources].sort());
  }
  expect(queryScopeOptions(["--out", "x", "--corpus", "scope-event", "--candidate", "scope-event"]).candidate)
    .toBe("scope-event");
});
