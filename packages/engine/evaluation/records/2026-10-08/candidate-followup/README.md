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

The manifest records code identities and evidence hashes. Native host discovery,
interactive trust, local-model context consumption, desktop acceptance, realistic
host-tool benchmarking and native Windows startup remain separate acceptance work.
