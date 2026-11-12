# Positive-task source precision follow-up

Recorded November 11, 2026 on macOS with Node.js 24.18.0. This changes the
scope evaluator's measurement and acceptance gates. No retrieval strategy,
fixture, dependency or production retrieval code changed.

## Protocol and gates

Protocol `query-scope-shadow-v3` retains the preceding 90 cases, seven strategies,
five diagnostic subsets and two fresh SQLite/Lance repeats in each export mode.
Providers are disabled. Reference chunks and manually seeded whole-document
rules isolate retrieval scope from extraction, grouping and ingestion.

Historical `correct`, positive recall, no-op and combined scores remain intact.
New row field `precise_correct` also requires zero additional source basenames;
exact citations and the 500-token cap are required by both row judgments.
`positive_exact` counts positives passing that stricter criterion. Missing all
retrieval or returning incomplete expected sentences cannot pass it. Both opposing
export documents and every original sentence, including qualifications, remain
required. A duplicate excerpt/rule from one source cannot inflate source precision.

`positive_with_additional_sources` counts positive rows containing any unexpected
source. `positive_source_precision` reports expected source memberships divided
by all retrieved source memberships on positive tasks, counting each source once
per task. The saved values are raw numerator/denominator counts; empty positive
retrieval contributes 0/0 and still fails recall/exactness. These memberships
measure the fixed fixtures' source labels, not semantic relevance within an
expected document. No-op tasks are scored separately and do not enter this ratio.

Every score and subset includes `gates`: all positive recall, positive exact,
no-op, exact-citation and token-cap gates must pass for `accepted`. Empty subsets
are not accepted. A subset containing only positives or only no-ops describes
only that subset, not the full corpus. `all_correct` retains historical meaning;
new `all_precise_correct` controls CLI success. Exit 1 can therefore mean a
completed comparison with preserved acceptance failures.

## Results

Counts below are **per export mode across two repeats**. Both modes agree.

| Strategy | Historical positive recall | Positive exact | Positives with extras | Source memberships relevant/retrieved | No-op |
| --- | --- | --- | --- | --- | --- |
| lexical | 98/98 | 36/98 | 62/98 | 120/208 | 4/82 |
| drop-request | 96/98 | 36/98 | 60/98 | 118/202 | 46/82 |
| mask-call-arguments | 44/98 | 4/98 | 58/98 | 56/136 | 42/82 |
| policy-guarded-arguments | 60/98 | 8/98 | 60/98 | 76/158 | 26/82 |
| local-bindings | 64/98 | 12/98 | 60/98 | 78/162 | 60/82 |
| clause-bindings | 82/98 | 30/98 | 56/98 | 96/174 | 60/82 |
| qualified-bindings | 94/98 | 40/98 | 56/98 | 114/192 | 68/82 |

All seven strategies fail acceptance. In the original subset, qualified bindings
still have perfect positive recall, but fail the positive exact gate. That
separates retained policy coverage from unwanted evidence without rewriting
historical results. The qualified candidate still misses the two positive
qualification/antecedent cases and retains the seven no-op failures per repeat.

All [2,520 results](final/results.json) preserve the preceding record's queries,
terms, XML, evidence, source/sentence diagnostics, citation/token flags and
historical judgments. All 2,520 rows pass citation and token checks, and evidence
and both judgments are stable across repeats. The fixture hash is unchanged.
The verifier compares archived bytes against the preceding manifest and checks
historical score projections, including all five subsets.

[Source diagnostics](positive-source-diagnostics.json) decompose every failed
positive task and attribute additional sources per strategy/export mode on the
first repeat. For qualified bindings, `brand.md` is additional on 15 of 49
positive tasks, `facilities.md` on nine and `renewal.md` on seven. These counts
overlap; they are not distinct task totals. This localizes the next scope work
without assuming a cause or excluding any source globally.

## Verification

Full build, workspace typechecks, website lint and 305 deterministic tests pass;
one opt-in real-model test is skipped. Totals are 156 engine, 30 shared-hook,
102 website, ten Codex and seven Claude Code tests. Sixteen focused tests cover
metric edge cases and real retrieval, including perfect recall with extra sources,
duplicate sources, opposing requirements, empty/truncated positives, no-ops,
citation/token failures and empty subsets.

The restricted full build stalled and was interrupted (exit 130). The full build
and process tests pass with local process/IPC access. Generated `next-env.d.ts`
paths were restored before typechecks and lint. The preceding qualified-binding
verifier passed before rebuilding. [Check metadata](checks/checks.json), sanitized
logs, compiled/source hashes, publication hashes and the manifest accompany this
record. The new verifier independently recomputes sentence coverage, precision,
all gates, all subsets, source diagnostics, repeat/order stability and baseline
identity, without calling the evaluator's scoring functions.

```sh
node packages/engine/evaluation/records/2026-11-11/positive-precision-followup/verify-evidence.mjs
npm run eval:query-scope -- --corpus qualified-bindings --out /tmp/othie-positive-precision-new --repeats 2
```

No clean install, audit refresh, remote CI inspection, native/model session,
adapter latency probe or independent scope validation was performed. New precision
controls still need macOS/Windows CI; preceding macOS cancellations remain open.
The latest audit evidence remains the November 7 parser record. Existing native
Windows, interactive trust, local-model consumption, dependency remediation,
signing and distribution acceptance work is unchanged.

Next use the source/task decomposition to address generic vocabulary and ambiguous
antecedents while preserving every qualifier, opposing requirement, historical
score and new precision gate. Validate scope improvements independently of the
co-developed diagnostic corpus before considering production adoption.
