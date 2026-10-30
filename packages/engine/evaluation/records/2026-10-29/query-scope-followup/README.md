# Query scope and recall comparison

Recorded October 29, 2026 in America/New_York (October 30 UTC), on macOS arm64
with Node.js 24.18.0. All fixtures are synthetic. Implementation commit `daa40db`
adds the evaluator; `da9931b` records the preceding multi-file history's CI.
Production retrieval and native fixtures remain unchanged.

## Scope comparison

The [protocol](final/protocol.json) freezes 27 cases and ten documents: the eight
native-agent documents plus the existing opposing export policies. It includes
all three unchanged multi-file tasks, additional signature/prose controls, policy
subjects written inside function arguments, and a 4,000-term prefix. Each of two
repeats seeds fresh SQLite/Lance stores for reference excerpts and rules-only
output. Case order reverses and strategy order rotates across repeats.

Rules-only output uses manually supplied whole-document authoritative rules.
This isolates scope from model extraction and rule grouping; it does not measure
classification or qualify reference text as production policy. Providers are
disabled. Positive recall requires every sentence from every expected source,
including exceptions, negations and both opposing export requirements. Controls
require no rules or excerpts. Additional sources for positives are reported
separately and do not count as recall failures.

The [summary](final/summary.json) has identical scores in each export mode:

| Strategy | Positive recall | No-op checks | Combined |
| --- | --- | --- | --- |
| Unchanged lexical retrieval | 30/30 | 4/24 | 34/54 |
| Remove the term `request` | 28/30 | 12/24 | 40/54 |
| Mask simple function-call arguments | 22/30 | 8/24 | 30/54 |

These totals comprise two repeats of 15 positive and 12 no-op cases, rather than
independent samples. The [324 raw results](final/results.json) retain original or
intervened queries, exact terms, supplied evidence, XML, missing sentences/sources,
additional sources, component timings and separate citation/token gates. All final
citations are exact and all final XML token counts are accurate and at most 500.
Judgments are stable across the two fresh repeats.

Both interventions remove unwanted refund evidence from the original array task.
Removing `request` also loses the request-subject policy query. Argument masking
loses telemetry, refund, access and both export policies when the policy subject
appears only inside the signature. Generic prose collisions remain, including
`request` in a variable description, `support` in a chart/variable task, `window`
in CSS, and `through` in array instructions matching facilities text. Neither
intervention meets acceptance; the combined gain from removing `request` cannot
compensate for its recall regression. Both remain evaluation-only.

All 40 existing applicability queries retain identical term lists under all three
strategies. This is a term-identity check, without model extraction or semantic
filtering. The new cases expose risks absent from that older query set. Component
timings exclude startup, ingestion, IPC and native generation; they establish no
hook latency or token-saving result. No fresh native/model sessions were run.

## Preserved intermediate results

The [initial run](initial-unmapped/summary.json) completed but scored every positive
incorrectly: macOS temporary paths used `/var` while citation roots resolved to
`/private/var`, producing unmapped source hashes. This was a harness setup error.
The evaluator now canonicalizes the temporary root before seeding. An end-to-end
regression requires mapped exact citations, expected no-op/recall failures, and
refusal to overwrite an existing evidence directory.

The [mapped intermediate run](mapped-before-citation-guard/summary.json) has the
same scope scores as the final run. The final implementation additionally requires
nonempty evidence quotations in its citation gate. Each run retains its own
compiled hashes; only the final run is checked against current compiled artifacts.
All three CLI invocations exit 1: their completed comparisons retain failed
acceptance gates. Their stdout/stderr are preserved under `checks/`.

## Validation and remaining acceptance

Clean installation, full workspace build and typechecks, website lint, and 198
deterministic tests pass; one opt-in model test is skipped. Both dependency audits
report zero advisories. Logs and exit results are retained in [checks](checks/checks.json).
No dependencies or production adapter paths changed. Prior native-host and serial
latency observations are not rerun or promoted to new acceptance evidence.

The [CI record](ci-9f416fe.json) verifies full revision
`9f416fe38d49c9f257c9274c3af04a82209a640a` on both macOS and Windows: clean
installation, typechecks, the then-current 193 tests, and Windows startup-script
syntax. The new query-scope commits still need CI. Automated runners do not
establish native Windows host or logon-startup acceptance.

The verifier checks file coverage and hashes, redaction, fixture identity, current
compiled artifacts for the final run, every final evidence quotation and token
count, case/strategy order, stable repeat judgments, independently recomputed
recall/no-op scores, preserved intermediate results, and CI steps:

```sh
node packages/engine/evaluation/records/2026-10-29/query-scope-followup/verify-evidence.mjs
```

Reproduce into a new directory after building:

```sh
npm run eval:query-scope -- --out /tmp/othie-query-scope-new --repeats 2
```

Semantic scope remains open. A subsequent candidate must preserve policy subjects
expressed as code and both opposing requirements while handling prose uses of the
same words. It must pass separate recall/no-op and end-to-end hook latency gates
before a production change. Local-model developer-context consumption, interactive
trust, native desktop/Windows sessions, production-scale repositories, additional
models, signing and model redistribution remain separate acceptance work.
