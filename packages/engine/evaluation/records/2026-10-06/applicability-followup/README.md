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
| [revised-applicability](revised-applicability/quality.json) | applicability-v2 / applicability | pass | 61/80 | 54/80 |
| [anchors-1](anchors-1/quality.json) | applicability-v3 / applicability | pass | 61/80 | 61/80 |
| [anchors-2](anchors-2/quality.json) | applicability-v3 / applicability | pass | 61/80 | 65/80 |

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
a downstream filter cannot repair. This second trial fixes the receipt/consent
multi-topic omissions but still fails eight query responses on generated quote
structure. It discards an opposing export prohibition, keeps historical badge
and support-chart false positives, and cannot recover missing support escalation,
lost-receipt substitution or missing-consent definitions absent from the lexical
candidate set. It remains worse than its paired baseline. All failures stay recorded.

`applicability-v3` replaces generated quotations with supplied anchor IDs. Each
positive decision must cite the task and its own original evidence item; negative
decisions must have empty anchors. The harness recovers the full original task
and quotation deterministically. Unknown, cross-item, missing, duplicate and
contradictory anchors reject the whole response. This changes the representation
of grounding, not its semantic standard: v1/v2 already allowed an exact quote
covering the full task/evidence. No fabricated quote is repaired or accepted.
The prompt also explicitly retains prohibitions when a task requests a prohibited
action. The quality scoring, corpus and production compiler are unchanged.

The first anchor run has no invalid decisions, but fixing representation does not
fix model judgment. It removes customer-directory, customer-CSS and receipt-font
false positives while dropping receipt boundaries, EU consent evidence and an
assistant credential prohibition at both caps. Positive diagnostics fall from
45/52 to 39/52 while no-op diagnostics improve from 16/28 to 22/28, leaving the
combined score unchanged. Historical-badge and support-chart controls still fail.
The three narrow subject queries still miss required evidence before the filter;
long complete incident evidence still fails at 200 tokens. Filter calls take
1.1–13.3 seconds; 26 of 32 exceed the hook's default 2,000 ms deadline before
process/transport overhead. This is not production acceptance.

The second anchor run also has complete valid decisions, but improves to 65/80
with different failures. It recovers receipt/consent qualifiers and the natural
historical-badge no-op, while dropping both vacation entitlements from the
contractor task. It still omits the assistant credential prohibition and retains
the fragmentary historical-badge and support-chart false positives. Positive
diagnostics are 41/52 and no-op diagnostics 24/28. The extracted policy set is
identical to the first run after ignoring list order. Nine of 32 model requests
change candidate ordering; some other decisions vary with identical messages,
schemas and requested sampling settings. Warm state and ranking ties remain
uncontrolled, so these runs do not isolate a cause for variation. Twenty-five
of 32 model calls exceed the default hook deadline.

The manifest records code identities, fixture/report/generation hashes, paired
scores and failures. Exact quotes ground a model decision in the supplied text
but do not prove its semantic truth. A production gate requires precision,
recall and operational latency acceptance together. [verification.json](verification.json)
records the patched dependency tree, clean production audit, 150 passing tests,
full workspace checks, SVG conversion and inspected previous-head CI results.
