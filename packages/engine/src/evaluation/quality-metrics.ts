import { basename } from "node:path";
import type { ContextBriefV1, RuleRecord } from "../types.js";
import type { QualityCase } from "./quality-cases.js";

export function missingPatterns(text: string, patterns: readonly string[]): string[] {
  return patterns.filter((pattern) => !new RegExp(pattern, "i").test(text));
}

export function missingEvidencePatterns(rules: ContextBriefV1["applicable_rules"], patterns: readonly string[], sources?: readonly string[]): string[] {
  // Generated labels cannot establish that a qualifier survived in evidence.
  const evidence = sources ? rules.filter((rule) => sources.includes(basename(rule.citation.source))) : rules;
  return missingPatterns(evidence.map((rule) => `${rule.text}\n${rule.citation.quote ?? ""}`).join("\n"), patterns);
}

/** Score before packing to distinguish candidate omissions from later losses. */
export function candidateCoverage(scenario: QualityCase, rules: readonly RuleRecord[]) {
  const sources = [...new Set(rules.map((rule) => basename(rule.sourcePath)))];
  const missingSources = scenario.sources.filter((source) => !sources.includes(source));
  const evidence = rules.filter((rule) => scenario.sources.includes(basename(rule.sourcePath)));
  const missing = missingPatterns(evidence.map((rule) => `${rule.text}\n${rule.quotation}`).join("\n"), scenario.patterns);
  return { candidate_count: rules.length, actual_sources: sources, missing_sources: missingSources,
    missing_qualifier_patterns: missing,
    complete: scenario.sources.length === 0 ? rules.length === 0 : missingSources.length === 0 && missing.length === 0 };
}

export function diagnosticScores(results: readonly { expected_sources: readonly string[]; correct: boolean }[]) {
  const score = (rows: typeof results) => ({ correct: rows.filter((row) => row.correct).length, total: rows.length });
  return { positive: score(results.filter((row) => row.expected_sources.length > 0)),
    no_op: score(results.filter((row) => row.expected_sources.length === 0)), combined: score(results) };
}
