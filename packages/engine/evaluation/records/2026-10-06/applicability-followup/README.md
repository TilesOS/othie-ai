# Grounded applicability follow-up

Synthetic local evaluations on October 6, 2026 using macOS, Node.js 24.18.0,
Ollama 0.35.1 and the already installed `qwen3.5:4b-mlx` model. The extraction
prompt remains `rules-v12`. Explicit temperature 0 and seed 42 are sent to each
generation; these settings do not establish determinism or independent samples.
Reports retain the original corpus, complete raw generations, lexical baseline
briefs, source coverage, applicability decisions and whole-rule packed results.
No model weights are downloaded or distributed.

| Run | Applicability prompt / corpus | Extraction coverage | Lexical baseline | Semantic diagnostics |
| --- | --- | --- | ---: | ---: |
| [initial-boundaries](initial-boundaries/quality.json) | applicability-v1 / boundaries | pass | 51/56 | 42/56 |

The initial filter is an observed failure. It drops the receipt threshold and
optional boundary while retaining only lost-receipt replacement evidence, and
narrows the combined telemetry query to its final non-EU clause, excluding EU
prohibition and missing-consent evidence. Both failures occur at both caps.
It still invents implementation intent for the historical-badge query. Four
queries fail structural validation: fabricated concatenated task quotes,
ellipses inserted into evidence quotations, or nonempty quotes for an excluded
item. Rejected responses publish no filtered selection; baseline briefs remain
for inspection and both cap scores fail. Expectations and quote validation
are not relaxed to hide these failures.

Extraction completes in one attempt per source with exact expected sentence
coverage, unchanged model digest, reference isolation and accurate hard caps.
Those checks cannot establish applicability. The filter adds 1.7–13.1 seconds
for nonempty query candidates in this trial, far beyond native prompt-hook
latency budgets. Normal engine delivery is unchanged.

The revised `applicability-v2` prompt explicitly considers the whole query and
interpretive definitions, baseline requirements and alternative boundaries. It
requires short exact contiguous quotes and forbids inventing implementation
intent, actions, project purposes or output formats. The separately scored
`applicability` corpus extends the unchanged boundary fixtures with eight
positive task/subject queries and four historical/descriptive/UI controls.
It includes narrow subject queries to expose lexical candidate omissions that
a downstream filter cannot repair. Both prompts and all failures stay recorded.

The manifest records code identities, fixture/report/generation hashes, paired
scores and failures. Exact quotes ground a model decision in the supplied text
but do not prove its semantic truth. A production gate requires precision,
recall and operational latency acceptance together.
