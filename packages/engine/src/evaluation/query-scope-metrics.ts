import { diagnosticScores } from "./quality-metrics.js";

interface ScopeMetricRow {
  expected_sources: readonly string[];
  actual_sources: readonly string[];
  correct: boolean;
  precise_correct: boolean;
  citations_exact: boolean;
  cap_passed: boolean;
}

/** Source membership precision is descriptive; acceptance also requires full recall. */
export function queryScopeScores(rows: readonly ScopeMetricRow[]) {
  const positives = rows.filter((row) => row.expected_sources.length > 0);
  const positiveExact = { correct: positives.filter((row) => row.precise_correct).length, total: positives.length };
  const extra = positives.filter((row) => row.actual_sources.some((source) => !row.expected_sources.includes(source)));
  // Count each source once per task. Multiple excerpts/rules from the same
  // source cannot inflate precision. Empty retrieval contributes zero to both
  // counts; it cannot pass the exact-positive or recall gates.
  const sources = positives.flatMap((row) => [...new Set(row.actual_sources)].map((source) => row.expected_sources.includes(source)));
  const diagnostics = diagnosticScores(rows);
  const gates = {
    positive_recall: diagnostics.positive.correct === diagnostics.positive.total,
    positive_exact: positiveExact.correct === positiveExact.total,
    no_op: diagnostics.no_op.correct === diagnostics.no_op.total,
    citations_exact: rows.every((row) => row.citations_exact),
    token_caps: rows.every((row) => row.cap_passed),
  };
  return { ...diagnostics, positive_exact: positiveExact,
    positive_with_additional_sources: { count: extra.length, total: positives.length },
    positive_source_precision: { relevant: sources.filter(Boolean).length, retrieved: sources.length },
    citations_exact: gates.citations_exact, caps_passed: gates.token_caps,
    // Empty subsets carry no acceptance evidence.
    gates: { ...gates, accepted: rows.length > 0 && Object.values(gates).every(Boolean) } };
}
