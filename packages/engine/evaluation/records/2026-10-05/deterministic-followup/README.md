# Deterministic selection and relevance follow-up

Synthetic local evaluations on October 5, 2026, using macOS, Node.js 24.18.0,
Ollama 0.35.1, and the existing `qwen3.5:4b-mlx` artifact with digest
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`.
The records preserve 26 full runs, including intermediate failures and three repeats
of each corpus with `rules-v11` and `rules-v12`. No model artifacts were
downloaded or redistributed. Each report checks the model
digest before and after evaluation and preserves messages, schemas, options, raw
classifications, original retained evidence, coverage, job attempts, and packed briefs.

| Run | Prompt / corpus | Completed | 200-token diagnostics | 500-token diagnostics | Sentence coverage |
| --- | --- | --- | ---: | ---: | --- |
| [initial-adversarial](initial-adversarial/quality.json) | rules-v10 / adversarial | yes | 18/21 | 20/21 | fail |
| [relevance-adversarial](relevance-adversarial/quality.json) | rules-v10 / adversarial | yes | 19/21 | 20/21 | fail |
| [adversarial-1](adversarial-1/quality.json) | rules-v11 / adversarial | yes | 20/21 | 21/21 | pass |
| [boundaries-1](boundaries-1/quality.json) | rules-v11 / boundaries | yes | 25/28 | 26/28 | pass |
| [standard-1](standard-1/quality.json) | rules-v11 / standard | yes | 7/7 | 7/7 | pass |
| [extended-1](extended-1/quality.json) | rules-v11 / extended | yes | 12/13 | 13/13 | pass |
| [adversarial-2](adversarial-2/quality.json) | rules-v11 / adversarial | yes | 20/21 | 21/21 | pass |
| [boundaries-2](boundaries-2/quality.json) | rules-v11 / boundaries | yes | 25/28 | 26/28 | pass |
| [standard-2](standard-2/quality.json) | rules-v11 / standard | yes | 6/7 | 6/7 | fail |
| [extended-2](extended-2/quality.json) | rules-v11 / extended | yes | 12/13 | 13/13 | pass |
| [adversarial-3](adversarial-3/quality.json) | rules-v11 / adversarial | yes | 20/21 | 21/21 | pass |
| [boundaries-3](boundaries-3/quality.json) | rules-v11 / boundaries | yes | 24/28 | 25/28 | fail |
| [standard-3](standard-3/quality.json) | rules-v11 / standard | yes | 7/7 | 7/7 | pass |
| [extended-3](extended-3/quality.json) | rules-v11 / extended | yes | 12/13 | 13/13 | pass |
| [entitlement-standard-1](entitlement-standard-1/quality.json) | rules-v12 / standard | yes | 7/7 | 7/7 | pass |
| [entitlement-adversarial-1](entitlement-adversarial-1/quality.json) | rules-v12 / adversarial | yes | 20/21 | 21/21 | pass |
| [entitlement-boundaries-1](entitlement-boundaries-1/quality.json) | rules-v12 / boundaries | yes | 25/28 | 26/28 | fail |
| [entitlement-extended-1](entitlement-extended-1/quality.json) | rules-v12 / extended | yes | 12/13 | 13/13 | pass |
| [entitlement-standard-2](entitlement-standard-2/quality.json) | rules-v12 / standard | yes | 7/7 | 7/7 | pass |
| [entitlement-adversarial-2](entitlement-adversarial-2/quality.json) | rules-v12 / adversarial | yes | 20/21 | 21/21 | pass |
| [entitlement-boundaries-2](entitlement-boundaries-2/quality.json) | rules-v12 / boundaries | yes | 25/28 | 26/28 | pass |
| [entitlement-extended-2](entitlement-extended-2/quality.json) | rules-v12 / extended | yes | 12/13 | 13/13 | pass |
| [entitlement-standard-3](entitlement-standard-3/quality.json) | rules-v12 / standard | yes | 7/7 | 7/7 | pass |
| [entitlement-adversarial-3](entitlement-adversarial-3/quality.json) | rules-v12 / adversarial | yes | 20/21 | 21/21 | pass |
| [entitlement-boundaries-3](entitlement-boundaries-3/quality.json) | rules-v12 / boundaries | yes | 25/28 | 26/28 | pass |
| [entitlement-extended-3](entitlement-extended-3/quality.json) | rules-v12 / extended | yes | 12/13 | 13/13 | pass |

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
The first adversarial run precedes the dependency refresh; the first boundaries run
overlaps it. The first standard run and subsequent repeats use refreshed dependencies.
The source-map patch and Mammoth CLI override are verified separately.

## Corpus boundaries and remaining failures

Standard, extended, and adversarial fixtures and `quality-v5` scoring remain unchanged;
fixture hashes match the preceding classification records. The new `boundaries` superset
adds four authoritative documents and seven cases: active quoted policy, historical
replacement, employee assistant-use policy, conditional replacement, and historical,
demonstration, and instruction no-op controls. It has 20 authoritative documents, one
vendor reference, and 28 retrieval cases. Coverage expectations were set before its
first run and have not been weakened.

All three `rules-v11` adversarial runs retain exactly the expected policy sentences,
exclude the quoted museum title, and pass both maintenance requirements and every no-op
control at both caps. Only the long incident evidence fails at 200 tokens. The 500-token
cases pass; this does not establish general classification or semantic applicability.

The first two `rules-v11` boundaries runs retain every expected policy and exclude all
expected non-policy sentences, including preserving active quoted requirements and
legitimate assistant-use policies. Each nevertheless fails two no-op controls at both caps: "paper badges" matches
the current digital badge policy on "badges"; "full customer directory" matches unrelated
policies on "full" or "customer". The long incident requirement still fails at 200 tokens.
Correct classification does not make a single subject-word match semantic relevance.
These failures remain scored and preserved for the next relevance work.

One standard repeat misclassifies both leave entitlements as descriptive despite explaining
that they establish existing entitlements. It scores 12/14 and fails sentence coverage;
this is an extraction omission at both caps. The third boundaries repeat labels the
conditional assistant-summary permission as a model instruction. It scores 49/56 and
fails coverage, with the permission lost at both caps and another assistant clause displaced
by packing at 200 tokens. The `rules-v11` totals are 40/42 standard, 75/78 extended,
123/126 adversarial, and 151/168 boundaries. All extraction jobs finish in one attempt;
structural completion cannot reject a semantically wrong classification.

Commit `682a0f7` clarifies that factual statements of benefits are policy entitlements
without requiring procedural language, and that bounded permissions for approved
organizational assistants are policy. The classifier is asked to check its explanation against
its final kind. Commit `4d35e90` additionally excludes bare numeric quantities from lexical
relevance; tests preserve queries combining a policy subject with a numeric threshold.
The `entitlement-*` runs use this `rules-v12` compiler and the unchanged fixtures/scoring.

The final three repeats score 42/42 standard, 75/78 extended, 123/126 adversarial, and
153/168 boundaries. Standard, extended, and adversarial repeats all retain exactly the
expected policy/non-policy sentences. Every adversarial case passes at 500 tokens; only
the long complete incident requirement fails at 200. Both maintenance requirements and
the original adversarial no-op controls pass in every repeat. The final extraction times
are 14–15 seconds standard, 25–29 extended, 46–48 adversarial, and 53–55 boundaries.
These are observations, not causal speed estimates.

The broader boundaries corpus remains a failure. All repeats still miss long incident
evidence at 200 tokens and fail the historical-badge and customer-directory no-op controls
at both caps. Only two of three repeats have exact expected sentence coverage. The first
labels the direct assistant request to print the customer directory and ignore privacy
as policy, inventing an explanation about prohibited behavior that the source does not
state. The original instruction is retained verbatim. Matching retrieval diagnostics do
not expose this additional coverage failure because the customer-directory control already
fails on unrelated policy words. The full `passed` gate nevertheless fails. Later repeats
exclude the instruction; this variability does not establish a prompt fix or safety proof.

All 26 full runs complete with one attempt per authoritative extraction job and preserve
exact citations, unchanged model identity, reference isolation, and valid hard caps.
The new compiler eliminates selection disagreements with classifications, but cannot
validate the semantic truth of those classifications. The reports explicitly preserve
that distinction. The manifest includes report/generation checksums. Generation temperature
and seed remain at model/runtime defaults; controlled generation settings and additional
models belong in the next evaluation rather than an inference of general reliability.


All completed reports preserve exact retained citations, reference isolation, unchanged
model identity, and accurate hard caps. The runs are fixed synthetic, unseeded observations
of one model. Different source revisions, warm state, and concurrent local build/test work
prevent a causal latency comparison. Passing this corpus does not prove prompt-injection
resistance, general semantic quality, or token savings.

## Verification and next work

After clean `npm ci`, the full workspace build, typechecks, website lint, and 143
deterministic tests pass, including all six process tests and isolated DOCX ingestion.
The final prompt/numeric changes also pass the engine suite and typecheck. Production
dependency audit is clean after the source-map patch and scoped argparse override;
five previously recorded development-tool findings remain. The bundled Mammoth CLI
help/conversion pass with upstream compatibility-alias deprecation warnings.

The [previous head's macOS/Windows CI](https://github.com/TilesOS/othie-ai/actions/runs/37264456510)
passes clean installation, all typechecks, the then-current 136 tests, and Windows
startup-script syntax. Current local commits have no new Windows CI or native-host,
desktop, persisted-trust, or logon-startup acceptance. The model service was temporarily
started for these runs and returned to its initially stopped state afterward.

Next work should score semantic classification and applicability together with precise
no-op controls and full policy recall. Preserve direct-instruction promotion as well as
entitlement/permission omissions, and measure controlled generation settings and additional
models without hiding the recorded failures. Implicit evidence links and long complete
evidence at tight budgets remain open. These small synthetic corpora establish neither
general quality nor token savings.
