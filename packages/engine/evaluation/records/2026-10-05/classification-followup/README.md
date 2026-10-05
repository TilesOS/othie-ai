# Compiler classification follow-up

Synthetic local evaluations on October 5, 2026, using macOS, Node.js 24.18.0,
Ollama 0.35.1, and the already installed `qwen3.5:4b-mlx` artifact with digest
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`.
The full reports verify the model digest before and after evaluation. No model artifacts
were downloaded or redistributed. Records contain synthetic fixtures and model outputs,
without personal source paths, credentials, or host session transcripts.

| Run | Prompt / corpus | Completed | 200-token diagnostics | 500-token diagnostics | Sentence coverage |
| --- | --- | --- | ---: | ---: | --- |
| [initial-extended](initial-extended/quality.json) | rules-v9 / extended | yes | 12/13 | 13/13 | pass |
| [standard-1](standard-1/quality.json) | rules-v9 / standard | yes | 7/7 | 7/7 | pass |
| [standard-2](standard-2/quality.json) | rules-v9 / standard | yes | 7/7 | 7/7 | pass |
| [standard-3](standard-3/quality.json) | rules-v9 / standard | yes | 7/7 | 7/7 | pass |
| [extended-1](extended-1/quality.json) | rules-v9 / extended | yes | 12/13 | 13/13 | pass |
| [extended-2](extended-2/quality.json) | rules-v9 / extended | yes | 12/13 | 13/13 | pass |
| [extended-3](extended-3/quality.json) | rules-v9 / extended | yes | 12/13 | 13/13 | pass |
| [adversarial-1](adversarial-1/quality.json) | rules-v9 / adversarial | no | 0/21 | 0/21 | fail |
| [adversarial-2](adversarial-2/quality.json) | rules-v9 / adversarial | yes | 18/21 | 20/21 | fail |
| [adversarial-3](adversarial-3/quality.json) | rules-v9 / adversarial | yes | 18/21 | 20/21 | pass |
| [baseline-adversarial](baseline-adversarial/quality.json) | rules-v6 / adversarial | yes | 14/21 | 14/21 | fail |

## Retained implementation

Commit `6b5d2a8` introduces `rules-v9`. A separate model request classifies each sentence
as policy, descriptive text, or a model instruction, with a short inspection explanation.
It receives original evidence without the selector's proposed ranges or labels. The
second request receives these classifications and selects complete original policy spans.
The engine checks every recovered sentence against classification and requires full
coverage and matching exclusions before publishing any rules. Explanations are never
exported as evidence. Source IDs remain invocation-local and schema-constrained.

Automatic syntactic qualification attachment stops at classified non-policy boundaries.
A requested range that crosses such a boundary still rejects the complete response;
the engine does not split or repair model-selected ranges. All non-policy sources finish
without a selection request. Both stages use the profile's approved extraction provider
and share one deadline and shutdown signal. Late results are rejected. Startup prompt
version detection rebuilds unchanged sources.

Seven additional deterministic tests cover structural classification, source identities,
contradictory decisions, qualification boundaries, explanation isolation, all-non-policy
sources, and cancellation. Commit `444421a` adds a durable retry test: a selector that
swallows a correctly classified instruction publishes no rules; a corrected retry
publishes only the original policy without rebuilding the source revision.

## Corpus and metadata

Commit `8656b53` adds `--corpus adversarial`, preserving standard and extended fixtures
and `quality-v5` scoring. Their fixture hashes match the October 4 retained-code reports.
The new superset has 16 authoritative documents, one vendor reference, and 21 retrieval
cases. It adds six documents covering history/appearance facts, a quoted display title
containing a requirement, varied model instructions, legitimate organizational restrictions
on assistant use, an all-non-policy source, and policy qualifications next to descriptive
text. Expected sentence coverage remains fixture-specific, not a general classifier.

New evaluator metadata includes each generation's response schema and options. Early
standard/extended repeats ran the same compiler with the preceding evaluator, so they
lack these additive fields; the manifest identifies that distinction. All raw messages
and responses are retained. The initial extended run precedes the classified qualification
boundary change; its uncommitted source snapshot was not retained. The other `rules-v9`
reports use the committed compiler. No trial is silently removed.

The baseline uses a temporary copy of the `8656b53` compiled evaluator, replacing only
its extractor with TypeScript source from `0e475f1`, transpiled locally. It uses the same
adversarial fixtures, scoring, model, and current retrieval/packing code. The first launch
through macOS's `/tmp` alias skipped the evaluator's direct-entry guard and produced no
report or model requests; the recorded baseline uses the canonical `/private/tmp` path.
This is one unseeded baseline run, not a complete prior-commit benchmark or a causal estimate.

## Results and remaining failures

Three standard repeats pass 42/42 diagnostics and retain every expected policy sentence.
Three extended repeats pass 75/78: 36/39 at 200 tokens and 39/39 at 500. Every repeat
excludes the maintenance descriptions and model instruction while retaining all expected
policy. Only long incident-report evidence fails at 200 tokens. The preceding `rules-v6`
extended repeats scored 57/78, with non-policy promotion in each repeat.

The larger adversarial corpus does not pass acceptance. Repeat 1 reaches the evaluator's
180-second deadline with the qualification source still pending after seven attempts;
`correct` gates on operational completion, so all 42 diagnostics report false. It also
retains the quoted museum title as policy. Repeat 2 completes in 109 seconds and scores
38/42, still retaining that title. Repeat 3 completes in 126 seconds and scores 38/42
with exact expected policy/non-policy coverage. Both completed repeats miss maintenance
notice evidence and long incident-report evidence at 200 tokens. All expected policy
is extracted in both; these losses occur during packing among lexically overlapping rules.

The descriptive no-op fails at both caps in both completed repeats. Repeat 2 promotes
the museum title and a legitimate support requirement; repeat 3 selects only the support
rule because the descriptive query's "seventeen minutes" shares "minutes" with the
policy's "thirty minutes". Per-rule overlap prevents neighboring-source promotion, but
single generic word matches still do not prove relevance. The new instruction controls
and all-non-policy control pass in both completed repeats.

The old-extractor baseline completes in 27 seconds and scores 28/42. It retains all
expected policy but also retains non-policy sentences and model instructions from five
authoritative documents. The comparison shows fewer observed promotions with the new
compiler, together with extra latency and an incomplete run. It does not establish
reliable semantic classification, general quality, or token savings.

All 11 full reports retain exact citations, stable model identity, vendor reference
isolation, and accurate hard caps, including the incomplete adversarial run. These
properties do not make an incorrect classification safe. Fresh revision identities,
unseeded generation, different corpus sizes, retries, and incidental load limit comparison.
One brief selection-prompt probe overlapped part of adversarial repeat 2; these timing
figures are observations, not a controlled latency benchmark.

## Isolated probes

`classification-probe.json` preserves a preliminary classification-only probe on the
extended documents. All classifications match those fixture expectations. This probe
uses the same model name and original evidence, but lacks the full evaluator's digest
and operational checks and uses a looser response schema; it is not an acceptance run.

`selection-probe.json` preserves a shorter selector prompt with recorded classifications
for the historical-support, qualification-boundary, and quoted-history sources. It still
crosses an excluded historical sentence and ignores the newsletter exclusion; only the
quoted-history selection respects all provided classifications. Neither the shorter
prompt nor its schema-property reordering is retained in code.

## Verification and next work

The full workspace build, typechecks, website lint, production audit, and all 136
deterministic tests pass locally, including the six process tests with local socket access.
One real-model test remains opt-in and skipped in the deterministic suite. Native desktop,
persisted hook trust, Windows sessions/startup, and current-commit Windows CI were not
verified by these local compiler runs.

Next work should separate selection reliability from classification accuracy: evaluate
structurally constrained or deterministic selections from explicit classifications,
retain qualifications across policy evidence, and avoid generated labels establishing
claims. Continue scoring the quoted-history source, genuine assistant-use policies,
all-non-policy sources, and operational completion. Evaluate lexical relevance and packing
under overlapping policy vocabularies; keep the long-evidence failure visible at 200 tokens.
Do not weaken expected coverage or no-op controls to make these reports pass.

To reproduce with the existing installed model service:

```sh
npm run eval:quality -- --corpus standard --out /tmp/othie-quality-standard-new
npm run eval:quality -- --corpus extended --out /tmp/othie-quality-extended-new
npm run eval:quality -- --corpus adversarial --out /tmp/othie-quality-adversarial-new
```

Each directory must be new. Diagnostic failures produce a nonzero exit and preserve
reports and generations. No statistically general acceptance or redistribution license
approval is implied by a passing small-corpus report.
