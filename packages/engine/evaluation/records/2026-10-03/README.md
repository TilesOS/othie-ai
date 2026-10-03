# October 3 acceptance records

Later [compiler follow-up records](compiler-followup/README.md) contain seven additional
runs, source-span recovery, and three final repeated measurements. The compiler section
below retains the original `rules-v1`/`rules-v2` observations.

All documents, tasks, and model outputs in this directory are synthetic. The benchmark
started October 2 local time and the native/model follow-ups completed October 3. These
are local macOS observations, not Windows or desktop UI acceptance.

## Native delivery

| Host | Observed model | Positive | Repository no-op | Revoked credential | Engine unavailable |
| --- | --- | --- | --- | --- | --- |
| Codex CLI 0.156.1 | `gpt-6-astra` | Pass | Pass | Pass | Pass |
| Claude Code 2.1.283 | `claude-opus-5-5` | Pass | Pass | Pass | Pass |

[Codex summary](native-codex/summary.json) and [Claude summary](native-claude/summary.json)
link their conditions to full response/receipt records. Each host answered `11`, `42`,
`unknown`, and `unknown` respectively. The source required eleven hours; that value was
absent from the user prompt. The receipts independently show cited injection, silence,
and content-free outcomes under a 500-token XML cap.

Codex used invocation-local hook configuration and one-shot trust for the generated hook.
Claude used explicit settings, with tools and MCP disabled. No global configuration was
edited. This does not test interactive trust review or project-file installation. A
[Codex project-file probe](native-codex-project-probe/summary.json) did not execute the
hook under this isolated launch configuration; its positive answer was `unknown`.
A [Codex local-model extract](native-codex-local-positive-extract.json) shows that the
adapter ran and supplied the canary, but `qwen3.5:4b-mlx` still answered `unknown`.
The extract explicitly omits repetitive local-runtime stderr telemetry. Earlier local
experiments used a different installed CLI version; the final summaries record the exact
executable version observed in each acceptance run.

The first Claude run uncovered a no-op false positive from the common word `not` in
"Do not use tools." The lexical stopword fix was applied before the passing records
here. Removing that query term does not remove source negations from returned evidence.

## Tool-using benchmark

[Protocol and fixtures](agent/protocol.json), [summary](agent/summary.json), and 36 full
trajectories preserve four paired tasks, three conditions, and three repeats. The
installed `qwen3.5:4b-mlx` digest was
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`.
Extraction, embeddings, and synthesis were disabled; Othie used real lexical retrieval
and cited excerpt packing with a 500-token cap.

| Condition | Tasks fully correct | Hidden probes passing | Cumulative input tokens | Output tokens | Tool calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| Task only | 0/12 | 33/66 | 16,966 | 3,509 | 36 |
| Full documents | 9/12 | 60/66 | 27,296 | 2,829 | 36 |
| Othie | 9/12 | 60/66 | 27,618 | 2,936 | 36 |

Both context conditions passed every policy task in all repeats. The repository-only
sorting task failed in every condition: the agent sorted but did not remove duplicates.
Othie correctly injected nothing for all three control repeats and provided context for
all policy cases. All trajectories ran public tests, demonstrating why hidden behavioral
checks are needed: public interface tests did not catch the sorting defect.

This small corpus provides no input-token savings: Othie's XML framing outweighed the
cost of these short documents. Input counts sum every model turn, including repeated
context/tool history, rather than measuring only injected context. Temperature zero and
repeated identical fixtures do not provide independent statistical evidence. This uses a
constrained local tool loop, not the native hosts above. Navigation hints remain deferred.

## Compiler quality

[Original prompt](quality-v1/quality.json) and [clarified prompt](quality-v2/quality.json)
retain raw generations, rules, and all 14 retrieval diagnostics. Each run used six
policy documents and an adversarial vendor reference, with rules-only export at 200 and
500 tokens. Neither report passes overall quality acceptance.

| Observation | `rules-v1` | `rules-v2` |
| --- | ---: | ---: |
| Source/qualifier diagnostics passing | 6/14 | 7/14 |
| Rules retained | 5 | 10 |
| Retained citations exact | All | All |
| Reference rules promoted | None | None |
| XML token caps respected | All | All |

The original model returned location labels, heading labels, or extra quotation marks
instead of exact evidence, so validation dropped many proposals. The clarification
retained travel and telemetry evidence in this run, but omitted receipt exceptions and
contractor/carry-over rules. At 200 tokens, whole-item packing also omitted required
qualifiers. At 500 tokens both opposing export rules survived, but differing generated
category/scope labels prevented an explicit conflict flag. Some generated applicability
labels require semantic review; exact quotations alone do not establish entailment.

The opt-in model test passes operational completion, citation integrity, budgets, and
reference isolation. Its passing status does not mean all quality diagnostics pass.
The fixture/prompt comparison is descriptive: one run each, no seeded extraction or
semantic grader, and generated source IDs vary between temporary corpora. Artifact
redistribution license/notice review remains pending; no model weights are distributed.
