import { expect, it } from "vitest";
import { scopeTermInterventions, scopeTermMatches } from "../src/evaluation/scope-term-diagnostics.js";

it("traces whole-word sentence matches without treating disclaimers as policy assertions", () => {
  const documents = [{ name: "guide.md", text: "Use clear sentences. This reference does not define storage limits. Storage must not exceed its limit." }];
  expect(scopeTermMatches(["use", "storage", "limit", "limits", "use"], documents)).toEqual([
    { source: "guide.md", sentences: [
      { index: 0, text: "Use clear sentences.", terms: ["use"] },
      { index: 1, text: "This reference does not define storage limits.", terms: ["storage", "limits"] },
      { index: 2, text: "Storage must not exceed its limit.", terms: ["storage", "limit"] },
    ] },
  ]);
  expect(documents[0]!.text).toContain("does not define storage limits");
});

it("retains exceptions, negative rules and both opposing sources in the trace", () => {
  const documents = [
    { name: "current.md", text: "Operators may deploy on Friday. Except during a freeze, deployment is allowed." },
    { name: "legacy.md", text: "Operators must not deploy on Friday." },
  ];
  expect(scopeTermMatches(["deploy", "freeze"], documents)).toEqual([
    { source: "current.md", sentences: [
      { index: 0, text: documents[0]!.text.split(". ")[0] + ".", terms: ["deploy"] },
      { index: 1, text: "Except during a freeze, deployment is allowed.", terms: ["freeze"] },
    ] },
    { source: "legacy.md", sentences: [{ index: 0, text: documents[1]!.text, terms: ["deploy"] }] },
  ]);
});

it("uses the production word boundary convention for Unicode and exact inflections", () => {
  const documents = [{ name: "unicode.md", text: "CAFÉ requests café2." }];
  expect(scopeTermMatches(["café", "request", "café2"], documents)[0]!.sentences[0]!.terms).toEqual(["café", "café2"]);
  expect(scopeTermInterventions(["request", "café", "unmatched"], documents)).toEqual([
    { kind: "only-term", term: "café", terms: ["café"] },
    { kind: "without-term", term: "café", terms: ["request", "unmatched"] },
  ]);
});

it("bounds probes to matching terms without dropping unmatched or late query terms", () => {
  const prefix = Array.from({ length: 4000 }, (_, index) => `preface${index}`);
  const terms = [...prefix, "deploy", "deploy", "freeze"];
  const documents = [{ name: "release.md", text: "Deploy only outside a freeze." }];
  const probes = scopeTermInterventions(terms, documents);
  expect(probes).toHaveLength(4);
  expect(probes[1]).toEqual({ kind: "without-term", term: "deploy", terms: [...prefix, "freeze"] });
  expect(scopeTermInterventions(["absent"], documents)).toEqual([]);
  expect(scopeTermInterventions([], documents)).toEqual([]);
  expect(scopeTermInterventions(["deploy"], documents)[1]!.terms).toEqual([]);
});
