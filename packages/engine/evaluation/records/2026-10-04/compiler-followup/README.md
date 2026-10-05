# Compiler packing and extraction follow-up

Five synthetic runs on October 4, 2026, using macOS, Node.js 24.18.0, Ollama 0.35.1,
and the already installed `qwen3.5:4b-mlx` artifact with digest
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`.
Each directory preserves `quality.json` and `generations.json`. They contain only the
fixed synthetic corpus, with no personal documents, credentials, host paths, or weights.

| Stage | Protocol | 200-token diagnostics | 500-token diagnostics | Rules retained |
| --- | --- | ---: | ---: | ---: |
| [Labels omitted from verbatim XML](labels-only/quality.json) | quality-v3 | 4/7 | 5/7 | 8 |
| [Shared citations and constrained source IDs](grouped-initial/quality.json) | quality-v3 | 7/7 | 7/7 | 9 |
| [Final scoring, repeat 1](final-1/quality.json) | quality-v4 | 7/7 | 7/7 | 9 |
| [Final scoring, repeat 2](final-2/quality.json) | quality-v4 | 6/7 | 6/7 | 9 |
| [Final scoring, repeat 3](final-3/quality.json) | quality-v4 | 7/7 | 7/7 | 10 |

The labels-only run uses code commit `4824ac4` and extraction prompt `rules-v4`.
Verbatim XML omits generated category/scope labels, which remain advisory metadata
in the structured brief. Both opposing export rules now fit at 200 tokens without
relying on short model-generated labels. This run also exposed `s2`/`s3` source IDs
for sentences belonging to the only supplied source, `s1`: rejected IDs removed the
international-travel and contractor/carryover evidence even at 500 tokens.

The grouped run uses code commit `6121d21` and prompt `rules-v5`. The extraction response
schema enumerates the invocation's authoritative source IDs; the instructions distinguish
those IDs from sentence numbers. Validation still rejects fabricated IDs instead of
repairing them. Changing the prompt version triggers startup reindexing.
Consecutive verbatim rules from one document revision, location, and authority share
one XML citation and authority in `<rule_group>`, retaining every whole statement and
each structured rule's full quotation. Different sources, revisions, locations, or
authorities cannot share that group.

The final repeats use code commit `df30131`, the same `rules-v5` prompt, and stricter
`quality-v4` scoring. `quality-v3` had excluded generated labels from qualifier scoring;
`quality-v4` additionally restricts evidence to the case's expected source files and
uses numeric-word boundaries so `written` cannot satisfy `ten`. The final fixture hash
therefore differs from the intermediate reports. The older October 3 `quality-v2`
reports counted generated scope wording as well as rule text. Results across protocols
are not directly comparable acceptance scores.

The final repeats pass 40/42 diagnostics: 20/21 at each cap. Two reports have
`passed: true`; the second repeat remains `passed: false`. In that repeat, the model
selects only the first two telemetry sentences, omitting the non-EU default and explicit
false-consent condition. No telemetry candidate is omitted during packing, and both
200- and 500-token results fail the same two qualifier patterns. This is an extraction
completeness failure, not evidence removed by the cap. All other final cases pass,
including the receipt boundary/lost-receipt procedure, contractor entitlement/carryover,
travel approval/medical waiver, both export conflict sides, and both no-op controls.

Every run completes with exact retained citations, unchanged model digest, no reference
rules promoted, and accurate hard token caps. Full workspace build/typechecks, website
lint, and all 118 deterministic tests pass locally; one opt-in model test is skipped
in that deterministic suite. The real-model observations here come from the evaluator.

These are fresh extractions of one small fixed corpus and one model. Generation is
unseeded and temporary revisions differ. Multiple changes affect extraction, rendering,
and scoring, so these runs do not isolate a causal effect or establish statistical or
semantic acceptance. Labels still need entailment review. Embeddings, synthesis, native
host/desktop consumption, Windows, and artifact redistribution were not evaluated.
No model weights were downloaded or redistributed. Overall compiler quality remains
open because selection is not consistently complete.

To reproduce with the installed model service running:

```sh
npm run eval:quality -- --model qwen3.5:4b-mlx --out /tmp/othie-quality-new-repeat
```

The directory must be new. A failing diagnostic produces a nonzero exit while retaining
the report and raw generations; both passing and failing repeats are preserved here.
