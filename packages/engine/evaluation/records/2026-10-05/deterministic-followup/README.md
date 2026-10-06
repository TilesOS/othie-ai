# Deterministic selection and relevance follow-up

Synthetic local evaluations on October 5, 2026, using macOS, Node.js 24.18.0,
Ollama 0.35.1, and the existing `qwen3.5:4b-mlx` artifact with digest
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`.
No model artifacts were downloaded or redistributed. Each report checks the model
digest before and after evaluation and preserves messages, schemas, options, raw
classifications, original retained evidence, coverage, job attempts, and packed briefs.

| Run | Prompt / corpus | Completed | 200-token diagnostics | 500-token diagnostics | Sentence coverage |
| --- | --- | --- | ---: | ---: | --- |
| [initial-adversarial](initial-adversarial/quality.json) | rules-v10 / adversarial | yes | 18/21 | 20/21 | fail |
| [relevance-adversarial](relevance-adversarial/quality.json) | rules-v10 / adversarial | yes | 19/21 | 20/21 | fail |
| [adversarial-1](adversarial-1/quality.json) | rules-v11 / adversarial | yes | 20/21 | 21/21 | pass |
| [adversarial-2](adversarial-2/quality.json) | rules-v11 / adversarial | yes | 20/21 | 21/21 | pass |
| [boundaries-1](boundaries-1/quality.json) | rules-v11 / boundaries | yes | 25/28 | 26/28 | pass |
| [standard-1](standard-1/quality.json) | rules-v11 / standard | yes | 7/7 | 7/7 | pass |
| [extended-1](extended-1/quality.json) | rules-v11 / extended | yes | 12/13 | 13/13 | pass |

These are the first completed runs; additional repeats will extend this record.
The machine's model service was initially stopped. One evaluator launch failed before
model metadata or generation, producing no report; the installed service was then started
on loopback. That launch is not counted as a completed evaluation.

## Implementation and intermediate failures

Commit `a36f3fc` derives every policy sentence directly from complete classifications,
with no second selection request. Syntactic qualifications are recovered together within
classified policy boundaries, and identical spans are deduplicated. Fixed metadata
(`policy`, `See cited evidence.`) makes no generated subject/scope claim. Unknown,
duplicate, missing, or invalid decisions and oversized evidence still reject the complete
job. Classification explanations never become evidence. The prompt version triggers
startup reindexing. Implicit evidence relationships remain open.

The first `rules-v10` adversarial run completes with one attempt per source in 42 seconds,
but still retains the quoted museum title, selects support on the generic word "minutes",
and loses maintenance notice and long incident evidence at 200 tokens. The report keeps
these failures visible rather than treating operational completion as semantic acceptance.

Commit `3678632` excludes generic quantities/time units as sole lexical relevance signals.
Duration-only queries now require a subject term or actual vector hit; global rules stay
unconditional. Original-evidence overlap is weighted by corpus rarity and evidence length.
Independently relevant rules sharing original revision, location, and authority stay
together at their strongest score before packing. No neighboring sentence is made relevant
by that grouping. A process test verifies both subject-based delivery and duration-only
no-op through the compiled MCP bridge. The relevance-only trial recovers both maintenance
requirements and removes the unrelated support hit, but the quoted title still fails.

Commit `82045d0` clarifies classification of the surrounding assertion: quoted display,
example, and historical wording does not establish an active requirement, while an active
organizational policy can be quoted. Organizational restrictions on employee assistant
use remain policies about human behavior. No fixture-specific title or canary appears in
the prompt. The `rules-v11` runs use this compiler; the remaining dependency commit
`b34da99` does not change the compiler, Markdown fixtures, retrieval, or scoring.
The first standard/adversarial/boundaries runs precede that dependency change; the further
repeats follow it. The source-map patch and Mammoth CLI override are verified separately.

## Corpus boundaries and remaining failures

Standard, extended, and adversarial fixtures and `quality-v5` scoring remain unchanged;
fixture hashes match the preceding classification records. The new `boundaries` superset
adds four authoritative documents and seven cases: active quoted policy, historical
replacement, employee assistant-use policy, conditional replacement, and historical,
demonstration, and instruction no-op controls. It has 20 authoritative documents, one
vendor reference, and 28 retrieval cases. Coverage expectations were set before its
first run and have not been weakened.

The first `rules-v11` adversarial runs retain exactly the expected policy sentences,
exclude the quoted museum title, and pass both maintenance requirements and every no-op
control at both caps. Only the long incident evidence fails at 200 tokens. The 500-token
cases pass; this does not establish general classification or semantic applicability.

The boundaries run retains every expected policy and excludes all expected non-policy
sentences, including preserving active quoted requirements and legitimate assistant-use
policies. It nevertheless fails two no-op controls at both caps: "paper badges" matches
the current digital badge policy on "badges"; "full customer directory" matches unrelated
policies on "full" or "customer". The long incident requirement still fails at 200 tokens.
Correct classification does not make a single subject-word match semantic relevance.
These failures remain scored and preserved for the next relevance work.

All completed reports preserve exact retained citations, reference isolation, unchanged
model identity, and accurate hard caps. The runs are fixed synthetic, unseeded observations
of one model. Different source revisions, warm state, and concurrent local build/test work
prevent a causal latency comparison. Passing this corpus does not prove prompt-injection
resistance, general semantic quality, or token savings.
