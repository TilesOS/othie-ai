# Sentence coverage and mixed-source compiler follow-up

Synthetic local runs on October 4, 2026, using macOS, Node.js 24.18.0, Ollama 0.35.1,
and the already installed `qwen3.5:4b-mlx` artifact with digest
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`.
Each directory preserves `quality.json` and `generations.json`; `manifest.json` identifies
the code stage, fixed fixture hash, coverage failures, and retried jobs. Records contain
only synthetic fixtures, without personal documents, credentials, host paths, or weights.

| Stage | Protocol / prompt | 200-token diagnostics | 500-token diagnostics | Rules retained |
| --- | --- | ---: | ---: | ---: |
| [Initial coverage guard](coverage-initial/quality.json) | quality-v4 / rules-v6 | 7/7 | 7/7 | 9 |
| [Coverage standard repeat 1](coverage-final-1/quality.json) | quality-v5 / rules-v6 | 7/7 | 7/7 | 12 |
| [Coverage standard repeat 2](coverage-final-2/quality.json) | quality-v5 / rules-v6 | 7/7 | 7/7 | 8 |
| [Coverage standard repeat 3](coverage-final-3/quality.json) | quality-v5 / rules-v6 | 7/7 | 7/7 | 9 |
| [Initial extended repeat 1](coverage-extended-1/quality.json) | quality-v5 / rules-v6 | 9/13 | 10/13 | 20 |
| [Initial extended repeat 2](coverage-extended-2/quality.json) | quality-v5 / rules-v6 | 9/13 | 10/13 | 14 |
| [Initial extended repeat 3](coverage-extended-3/quality.json) | quality-v5 / rules-v6 | 8/13 | 9/13 | 20 |
| [Prompt-only classification trial](classification-initial/quality.json) | quality-v5 / rules-v7 | 9/13 | 10/13 | 18 |
| [Sentence-only extended trial](sentences-initial/quality.json) | quality-v5 / rules-v8 | 9/13 | 10/13 | 22 |
| [Sentence-only standard repeat 1](sentences-standard-1/quality.json) | quality-v5 / rules-v8 | 6/7 | 6/7 | 11 |
| [Sentence-only standard repeat 2](sentences-standard-2/quality.json) | quality-v5 / rules-v8 | 7/7 | 7/7 | 14 |
| [Sentence-only standard repeat 3](sentences-standard-3/quality.json) | quality-v5 / rules-v8 | 7/7 | 7/7 | 14 |
| [Retained code standard repeat 1](reviewed-standard-1/quality.json) | quality-v5 / rules-v6 | 7/7 | 7/7 | 11 |
| [Retained code standard repeat 2](reviewed-standard-2/quality.json) | quality-v5 / rules-v6 | 7/7 | 7/7 | 11 |
| [Retained code standard repeat 3](reviewed-standard-3/quality.json) | quality-v5 / rules-v6 | 7/7 | 7/7 | 10 |
| [Retained code extended repeat 1](reviewed-extended-1/quality.json) | quality-v5 / rules-v6 | 9/13 | 10/13 | 20 |
| [Retained code extended repeat 2](reviewed-extended-2/quality.json) | quality-v5 / rules-v6 | 9/13 | 10/13 | 20 |
| [Retained code extended repeat 3](reviewed-extended-3/quality.json) | quality-v5 / rules-v6 | 9/13 | 10/13 | 22 |

## Retained implementation

Commit `906d8da` introduces `rules-v6`: every authoritative sentence must appear in
recovered rule evidence or in an explicit `non_policy_sentences` disposition. Unknown
IDs, invalid/oversized selections, missing dispositions, overlapping policy/non-policy
decisions, and duplicate exclusions reject the whole response. The durable extraction
queue retries without publishing partial rules. Recovered syntactic qualifications also
count toward coverage, and cannot simultaneously be excluded. Generated labels remain
advisory; the engine still copies original contiguous evidence exactly.

Commit `361464e` adds `quality-v5` fixture-wide expected sentence coverage and a separate
extended corpus. Standard fixtures expect all 14 authoritative sentences; the extended
corpus expects 24 policy sentences across ten authoritative documents, with three explicit
non-policy sentences in the mixed maintenance source. Missing expected policy or retained
non-policy/reference sentences fail independently of retrieval diagnostics. Raw exclusions
remain available in generations. These are known fixture expectations, not a general
semantic classifier. The original seven retrieval cases and input texts remain unchanged.

The extended corpus adds regional renewal defaults, maintenance policies separated by
descriptive text and a model-directed instruction, linked privileged-access extensions,
and a long incident-report requirement. Six additional retrieval cases include descriptive
and authoritative-instruction no-op controls. Both corpora use real model extraction,
rules-only export, and 200/500-token caps. Job attempt counts expose successful retries.

Commit `07910f5` fixes a separate relevance failure found while reviewing this corpus:
keyword matches elsewhere in a source previously promoted every rule in that chunk.
Keyword selection now requires overlap in each rule's evidence. Only actual vector hits
can select a source-backed rule without literal overlap; global rules remain unconditional.
Deterministic regression tests verify a descriptive-sentence no-op and preserve the
existing semantic-hit test. Commit `41df142` adds an explicit regression that rejects
an excluded model instruction swallowed by a policy range.

## Classification trials

The prompt-only `rules-v7` trial lists exclusions before policy selections and explicitly
distinguishes historical/appearance descriptions from policy. It excludes both descriptive
maintenance sentences but still selects a policy range spanning the intervening model
instruction. The `rules-v8` trial replaces ranges with individual policy-sentence selections.
It still promotes the model instruction, and its extended run excludes domestic travel
and the leave carryover rule as descriptive. One standard repeat excludes the entire leave
document, scoring 12/14; two later repeats score 14/14.

Neither trial is retained. Their prompts and raw output formats are preserved, but the
uncommitted source snapshots are not; `manifest.json` labels these stages explicitly.
The retained code uses `rules-v6` ranges with full coverage validation and the keyword
relevance fix. Trial results do not establish a causal ranking of prompt formats.

## Boundaries and next checks

Complete sentence disposition is bookkeeping, not correct classification: a model can
explicitly exclude a true policy or select non-policy text. The initial extended repeats
promote maintenance descriptions and the model instruction; one also labels the non-EU
telemetry default descriptive. The standard-only coverage repeats pass all fixture
sentences, illustrating why that small corpus cannot establish general acceptance.

The long incident requirement is retained during extraction, but complete evidence can
exceed the 200-token output budget. The cap remains accurate and rules remain whole;
source/qualifier diagnostics still fail when necessary evidence cannot fit. At 500 tokens
the long-evidence case passes in the completed repeats. No truncation or scoring exception
was added to make the stress case pass.

The final retained-code reports, including unsuccessful repeats, are the `reviewed-*`
directories above. Full build, typechecks, website lint, and all 128 deterministic tests
pass locally, including process tests with local socket access. The production dependency
audit reports no advisories. Existing GitHub CI for prior commit `19a9dfe` passes on macOS
and Windows; these new local commits have not been pushed for their own Windows CI.

All six retained-code repeats complete. Standard diagnostics pass 42/42, with every
expected policy sentence retained. Extended diagnostics pass 57/78: 27/39 at 200 tokens
and 30/39 at 500. Every final extended run retains all expected policy but also retains
the maintenance source's two descriptions and model instruction; three no-op cases fail
at both caps. The long-evidence case fails only at 200 tokens. Each report's `passed` flag
requires both retrieval diagnostics and fixture-wide policy/non-policy coverage.
All 18 recorded runs preserve exact retained citations, unchanged installed model digest,
accurate hard caps, and vendor reference isolation. Those properties do not prevent the
separately observed promotion of an instruction from an authoritative source.

Next acceptance work remains semantic policy/non-policy classification, linked evidence
and budget sensitivity on larger corpora, generated-label entailment, additional models,
embeddings/synthesis, native host/desktop consumption, and current-commit Windows checks.
Fresh temporary revisions and unseeded generation limit repeat comparability. This fixed
synthetic corpus supplies no statistical or general quality/token-savings claim.
No model weights were downloaded or redistributed, and artifact license/notice review
remains pending.

To reproduce the retained code with the installed model service:

```sh
npm run eval:quality -- --corpus standard --out /tmp/othie-quality-standard-new
npm run eval:quality -- --corpus extended --out /tmp/othie-quality-extended-new
```

Each output directory must be new. Diagnostic failures produce a nonzero exit while
retaining the report and raw generations.
