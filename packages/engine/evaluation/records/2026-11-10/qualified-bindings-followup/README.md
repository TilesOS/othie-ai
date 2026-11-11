# Qualified binding scope follow-up

Recorded November 10–11, 2026 in America/New_York, on macOS arm64 with Node.js
24.18.0. Fixture commit `bfa2f44` adds 16 counterexamples; implementation commit
`640d597` adds an evaluation-only candidate. Production retrieval is unchanged.

## Hypothesis and protocol

The preceding clause candidate retained policy subjects under plain operation
negation, lost them under adverbial negation, and dropped a subject before a
trailing company qualification. The new `qualified-bindings` candidate preserves
delimiter identity, associates a comma-separated `following`, `under` or
`according to` modifier with its immediate antecedent, and removes negated
policy-lookup cues before running the prior local masker. It carries a negated
operation's subject into an immediately following implementation instruction
without its own call/quoted target. Other negated local operations are masked.
This remains a prose heuristic, not a parser or reliable intent classifier.
No fixture IDs, expected labels, filenames or policy text enter the candidate.

The [protocol](final/protocol.json) retains all 74 earlier cases and six earlier
strategies, adding eight positive and eight no-op cases. They probe modifier
placement, adjacent/distant antecedents, replacement intent, quoted modifiers,
negated lookup and local follow-ups. These cases were authored for this
hypothesis, not independently held out. The single-repeat dry run exposed the
same nine failed cases as the final run; no code or fixture changes followed it.
All earlier corpus options retain their cases/strategies. Select the extension
explicitly with `--corpus qualified-bindings`.

Two fresh SQLite/Lance repeats per export mode reverse case order and rotate
strategy order, with providers disabled. Reference excerpts and manually seeded
whole-document authoritative rules isolate scope from extraction and grouping.
Positive recall requires every expected original sentence, including exceptions
and both opposing export rules. Additional positive sources are reported but do
not fail that recall score; no-ops require empty evidence. Component timings do
not establish native-hook latency or ingestion/model behavior.

## Results and limitations

The [summary](final/summary.json) is identical across export modes. Counts include
two controlled repeats, not independent samples. Subset cells show positive
recall followed by successful no-ops.

| Strategy | Full positives | Full no-ops | Original | Guard | Local binding | Clause binding | Qualification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lexical | 98/98 | 4/82 | 30/30; 4/24 | 18/18; 0/18 | 12/12; 0/12 | 22/22; 0/12 | 16/16; 0/16 |
| Drop request | 96/98 | 46/82 | 28/30; 12/24 | 18/18; 12/18 | 12/12; 2/12 | 22/22; 6/12 | 16/16; 14/16 |
| Mask arguments | 44/98 | 42/82 | 22/30; 8/24 | 10/18; 12/18 | 4/12; 0/12 | 8/22; 8/12 | 0/16; 14/16 |
| Policy guard | 60/98 | 26/82 | 30/30; 8/24 | 14/18; 4/18 | 4/12; 0/12 | 8/22; 4/12 | 4/16; 10/16 |
| Local bindings | 64/98 | 60/82 | 30/30; 14/24 | 18/18; 16/18 | 6/12; 8/12 | 8/22; 8/12 | 2/16; 14/16 |
| Clause bindings | 82/98 | 60/82 | 30/30; 14/24 | 18/18; 16/18 | 12/12; 12/12 | 18/22; 8/12 | 4/16; 10/16 |
| Qualified bindings | 94/98 | 68/82 | 30/30; 14/24 | 18/18; 16/18 | 12/12; 12/12 | 22/22; 12/12 | 12/16; 14/16 |

All 41 positive cases in the preceding corpus survive (82/82 across repeats
per mode). Both preceding positive failures and both preceding negation no-op
failures are recovered. Prior no-ops improve from 50/66 to 54/66; the six
generic `through`, `width` and chart cases still fail each repeat.

Three new cases fail each repeat: `as required by company documents` loses the
export subject; an intervening sentence breaks the refund antecedent; and a
numeric-comparator implementation after negated sorting wrongly retains
`request`. All nine failures recur in both export modes. The candidate fails
acceptance and is not adopted.

Positive recall also does not establish precise applicability. Of the 98 positive
rows per mode, 56 contain additional sources; only 40 both pass recall and have
no additional sources. The other two rows without additional sources miss their
expected evidence. The verifier checks these counts directly from row evidence.
Future scope acceptance should explicitly gate unwanted evidence on positive
tasks too, while retaining these recall scores for comparison.

All [2,520 rows](final/results.json) retain queries, terms, XML, evidence and
complete-sentence judgments. Exact citations and 500-token gates pass, and
evidence/judgments are stable across repeats. All 1,776 rows shared with the
preceding clause record preserve query terms, text, evidence and judgments.
The 40 earlier applicability queries preserve lexical terms under the candidate;
that is a compatibility check, not independent scope validation. Generalization
and independent validation remain open.

## Verification and CI

Full build, workspace typechecks, website lint and 301 deterministic tests pass;
one opt-in real-model test is skipped. Totals are 152 engine, 30 hooks,
102 website, seven Claude Code and ten Codex tests. Twenty focused scope tests
pass. Full build and process tests use local process/IPC access. The generated
`next-env.d.ts` paths were restored before final typechecks and lint. The prior
clause evidence verifier passed before rebuilding the extended evaluator.

The [run for `ed3dcdb`](https://github.com/TilesOS/othie-ai/actions/runs/42668128040)
passes Windows installation, typechecks, website lint, tests and startup syntax.
macOS was cancelled without recorded steps. A single-job retry of the cancelled
macOS job was accepted; run attempt 2 again completed as cancelled with no macOS
steps. [Initial run/job evidence](checks/ci-ed3dcdb.json) and
[retry evidence](checks/ci-ed3dcdb-retry.json) preserve both observations. No cause
of cancellation is established. This closes only the preceding clause history's
Windows CI gap. macOS history and both runners for the new candidate remain
open. No commits were pushed and no further retries were requested.

[Check metadata](checks/checks.json), sanitized logs, source/compiled hashes,
publication hashes and a complete manifest accompany this record. The verifier
independently recomputes scores, five diagnostic subsets, every expected
sentence, extra-source counts, repeat/order consistency, paired baseline rows,
citation/token gates, source identity, partial CI and the cancelled retry.

```sh
node packages/engine/evaluation/records/2026-11-10/qualified-bindings-followup/verify-evidence.mjs
npm run eval:query-scope -- --corpus qualified-bindings --out /tmp/othie-qualified-bindings-new --repeats 2
```

The evaluator exits 1 for completed failed acceptance gates. No dependency change,
clean install, audit refresh, native/model session or adapter latency probe was
performed. The November 7 parser record remains the latest audit evidence.

Next make additional-source precision an explicit scope metric/gate, resolve
generic prose/layout subjects and ambiguous antecedents without losing opposing
requirements, and validate independently of these co-developed diagnostics.
Interactive trust, native Windows sessions, provider context consumption,
compatible minimatch remediation, signing and redistribution remain separate.
