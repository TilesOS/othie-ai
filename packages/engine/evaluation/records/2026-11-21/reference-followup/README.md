# Policy reference scope evaluation

Recorded November 21, 2026 on macOS arm64 with Node.js 24.18.0. Commit `eecdb9e`
freezes eight synthetic documents and 20 tasks before `70b9d07` adds the comparisons.
The new fixtures cover lab and vendor certificates, loan and grant expiration,
opposing disposal standards, and local data tasks. The same author prepared the
fixtures and candidate. The cases provide a separate frozen corpus for this run.
Independent authorship and judgment are still needed.

`--candidate scope-reference` runs the seven baselines and the two November 18
assertion arms before the new comparisons in each fresh SQLite/Lance store.
`reference-only` can carry the subject of one simple negated call across an
optional interface-preservation instruction to an explicitly qualified replacement.
It also applies narrow local-clause rules for comparator and formatting work, local
plots, fixture filenames, malformed local calls, and negated lookup. `reference-focus`
adds source admission on a named policy in the first clause and can suppress a
one-term overlap when another source matches that term and more query terms. Both
variants pack original evidence, including exceptions, prohibitions, and disclaimers.

| Corpus and strategy | Positive recall | Positive exact | No-op |
| --- | ---: | ---: | ---: |
| Historical assertion-subject | 96/98 | 88/98 | 78/82 |
| Historical reference-only | 98/98 | 92/98 | 82/82 |
| Historical reference-focus | 98/98 | 94/98 | 82/82 |
| Transfer assertion-subject | 32/34 | 28/34 | 20/26 |
| Transfer reference-only | 34/34 | 32/34 | 26/26 |
| Transfer reference-focus | 34/34 | 34/34 | 26/26 |
| New reference corpus assertion-subject | 22/24 | 6/24 | 2/16 |
| New reference corpus reference-only | 24/24 | 8/24 | 12/16 |
| New reference corpus reference-focus | 24/24 | 14/24 | 12/16 |

Scores are per export mode and include two repeats. Both modes produce the same
scores. The 1,120 new candidate rows preserve every passing November 18 recall
and exact judgment in the two earlier corpora and every passing paired assertion
judgment in the new corpus. All 3,360 historical/transfer baseline rows and 960
paired prior assertion rows match the November 18 commitments except component
time. All prior summaries match. Each candidate row passes exact citations and
the 500-token cap, with stable evidence and judgments across repeats. Both variants
preserve 39/40 older applicability term traces, the same as assertion-subject.

Both variants recover the distant refund and upload subjects and stay silent for
their local comparator controls. `reference-focus` suppresses the retention
collision on deployment while keeping both deployment standards. It still pulls
export policy into two historical refund tasks. On the new corpus it retains
extra sources on five of twelve positives, including disposal standards on loan
renewal and calibration rules on a vendor-only request. The two remaining no-op
failures are the ambiguous two-call reference and a malformed call whose prose
still mentions instruments. Neither variant passes acceptance across corpora.
The reference parser handles the measured surface patterns. Applicability of
shared terms, cross-clause resolution, and within-source relevance need further
evaluation before any production change.

## Verification

The JSONL files contain verbatim evidence and judgment fields from the first
repeat in both export modes. `run.json` captures whole-run hashes, fixture and
compiled artifact commitments, and scores. The verifier rebuilds the recorded
two-repeat ordering from the JSONL, checks citations and scores, and can compare
all raw rows from a fresh rerun. The November 18 verifier passed on its own
compiled revision before this build. Its artifact check detects this run's
different evaluator hash when asked to compare the newer run. The new verifier
checks row and summary parity across revisions and checks the hashes of the
unchanged components separately.

All workspace builds and typechecks, website lint, and 321 deterministic tests
passed locally. One opt-in real-model test was skipped. The current registry
audits report seven moderate development entries and zero production findings.
The published [GitHub Actions run for `45ae572`](https://github.com/TilesOS/othie-ai/actions/runs/44446520279)
passed both desktop jobs, including clean install, typecheck, website lint and
tests, plus Windows startup script syntax. This verifies the replacement macOS
runner and the preceding assertion/Next.js commits. The new comparisons have
local evidence. Native desktop-host and model acceptance remain open.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
evaluator=packages/engine/dist/src/evaluation/query-scope.js
node "$evaluator" --corpus qualified-bindings --candidate scope-reference --out "$run_dir/historical" --repeats 2
node "$evaluator" --corpus scope-transfer --candidate scope-reference --out "$run_dir/transfer" --repeats 2
node "$evaluator" --corpus scope-reference --candidate scope-reference --out "$run_dir/reference" --repeats 2
node packages/engine/evaluation/records/2026-11-21/reference-followup/verify-evidence.mjs "$run_dir"
```

Each evaluator command exits 1 when the baseline quality gates fail. Successful
execution writes `summary.json` with `completed: true` for each corpus.
