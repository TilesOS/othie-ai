# Source candidate and recorded-input follow-up

Synthetic local evaluations on October 8, 2026 using macOS, Node.js 24.18.0,
Ollama 0.35.1 and the already installed `qwen3.5:4b-mlx` digest. No model
weights are downloaded or distributed. Source fixtures, corpus expectations,
`rules-v12`, `applicability-v3`, temperature 0 and seed 42 are unchanged.

## Source-revision candidate experiment

The [full report](source-revision/quality.json) and [raw generations](source-revision/generations.json)
record evaluation code `61358a0`. The evaluator attaches extracted whole policies
from the same profile, document, revision, source and authority to lexical subject
hits. This overfetch cannot establish semantic relationships and may add unrelated
requirements from a mixed-topic document. It remains evaluation-only.

Pre-packing candidate coverage rises from 23/26 to 26/26 positive cases. The three
recovered gaps are short `support`, `receipts` and `telemetry` queries: unresolved
escalation, lost-receipt substitution and missing-consent definitions are now
available to the filter. This is fixture-specific source/regex coverage, not proof
of complete candidate selection or implicit links in arbitrary documents.

| Packed diagnostic | Paired lexical baseline | Expanded candidates + filter |
| --- | ---: | ---: |
| Positive | 45/52 | 41/52 |
| No-op | 16/28 | 24/28 |
| Combined | 61/80 | 65/80 |

The combined improvement still hides a positive recall regression. Both vacation
entitlements and the assistant credential prohibition are filtered out. Historical
badge and support-chart controls remain false positives. Two opposing-export
responses have contradictory anchors and are rejected; the human-assistant query
reaches the 20-second generation deadline. These fail both cap scores, with lexical
baseline evidence preserved. Long complete incident evidence remains omitted at
200 tokens. Expectations and validation are unchanged.

All expected extraction sentences are retained, non-policy/reference sentences
are excluded, every extraction job completes in one attempt, and the installed
model digest is unchanged. Retained quotations remain exact and hard token caps
are accurate. Twenty-seven of 32 nonempty filter calls miss the 2,000 ms hook gate;
observed filtering spans 1.3–20.0 seconds, including the deadline. Filtering excludes
stdin, startup, retrieval and transport overhead. Both semantic and latency gates
fail, so this experiment does not qualify for production delivery. Some workspace
build/typecheck/test work overlapped this trial; runtime load and warm state are
uncontrolled, so timings are observations rather than an isolated comparison.

## Fixed recorded-input replay

The [protocol](fixed-replay/protocol.json), [summary](fixed-replay/summary.json) and
96 per-attempt files record replay code `a3e02c6`. Each of three repeats sends the
same 32 nonempty requests from October 6 `anchors-1` in their original case order,
with exact messages, candidate ordering, schemas and sampling options. Model digest
is checked before and after. Eight empty-candidate cases have no model calls and
are listed separately. No extraction, fresh engine, re-ranking or packing occurs.

The [recorded baseline](fixed-replay/recorded-baseline.json) is an offline scoring
of the original retained decisions using code `4775e6c`; it makes no new model calls
or latency measurements. Replay quality uses the same pre-packing source/qualifier
and explicit-conflict diagnostics. These totals are not comparable to packed
`quality-v5` acceptance scores.

| Pre-packing diagnostic | Original recording | Repeat 1 | Repeat 2 | Repeat 3 |
| --- | ---: | ---: | ---: | ---: |
| Positive | 20/26 | 19/26 | 19/26 | 18/26 |
| No-op (nonempty candidates only) | 3/6 | 4/6 | 3/6 | 3/6 |
| Combined | 23/32 | 23/32 | 22/32 | 21/32 |

All 96 responses are structurally valid with the same installed digest, but eight
queries produce two distinct applicability decision sets across repeats. Explanation
wording alone does not count as a decision change. Variation includes vacation
entitlements, opposing export requirements, active quoted policy and assistant-use
restrictions/permissions. Eight, four and four queries respectively differ from
the recording. Fixed request hashes verify identical replay inputs for each query.
This establishes observed variation under fixed ordering, not its cause; warm state,
runtime internals and machine load remain uncontrolled. Some deterministic verification
work overlapped replay. Controlled settings do not make samples independent.

Seventy-seven of 96 filtering calls miss the necessary 2,000 ms hook gate. Observed
calls take 1.2–12.9 seconds before other hook overhead. Pre-packing policy recall
still regresses against the recording. This replay fails both quality and latency
acceptance. Per-attempt output and hashes preserve failures without repairing model
decisions, changing expectations or treating structurally grounded judgments as true.

## Enforced generation budget

The [budget replay](budget-replay/summary.json) records code `4775e6c`, the same
32 archived requests and one repeat with `generation_deadline_ms: 2000`. Seven
requests produce valid responses within that budget; 25 publish no raw decisions
and fail. Those attempts complete at 2.000–2.004 seconds as cancellation unwinds.
All failed attempts remain saved. Pre-packing diagnostics pass only 4/32
(3/26 positive, 1/6 nonempty no-op); the installed digest stays unchanged. A
nonzero evaluator exit is the expected acceptance failure. A model budget alone
still excludes the rest of the native hook's work.

The model was unloaded and the temporary loopback service returned to its initially
stopped state after all trials. No native host sessions or desktop UI acceptance
were repeated. The final workspace tests pass 159 deterministic cases with one
opt-in live-model test skipped. Build, typechecks, website lint, production audit
and whitespace checks pass. macOS/Windows CI through `8d8243f` was inspected and
passes; new local evaluator commits still require their own CI.

The [verification record](verification.json) preserves the final checks and inspected CI.
The manifest records code identities and evidence hashes. Native host discovery,
interactive trust, local-model context consumption, desktop acceptance, realistic
host-tool benchmarking and native Windows startup remain separate acceptance work.
