# Context delivery model smoke evaluation — 2026-09-22

This is a small synthetic check of whether Othie's current context compiler helps a
model answer questions about information outside the active repository. It is a
component evaluation, not the roadmap's tool-using coding-agent benchmark.

## Protocol

- Runtime: local Ollama `qwen3.5:4b-mlx` for both Othie rule extraction and answers.
- Corpus: three short authoritative policy files and three unrelated reference files,
  generated in temporary storage. The complete six-file context is 478 tokens under
  Othie's `o200k_base` tokenizer.
- Tasks: enterprise weekend support response, Acme annual-plan refund exception, EU
  telemetry default with missing consent, and a repository-only arithmetic control.
- Conditions: task alone (`baseline`), all six documents (`full_documents`), or Othie's
  retrieved and packed context (`othie`). The task, model, and answer format were the
  same across conditions. Answers were short plain text, scored against fixed values.
- Othie context cap: 200 tokens. Keyword retrieval and model rule extraction were
  enabled; embeddings and query-time synthesis were disabled. The control should yield
  an empty result and inject no context.
- Three full runs used the same fixtures and settings. Raw reports are local artifacts
  under the git-ignored `packages/engine/evaluation/results/` directory.

| Run (UTC) | Baseline | Full documents | Othie | Othie answer input tokens, four tasks |
| --- | ---: | ---: | ---: | ---: |
| 23:17 | 1/4 | 3/4 | 4/4 | 1004 |
| 23:18 | 1/4 | 3/4 | 4/4 | 1000 |
| 23:19 | 1/4 | 3/4 | 4/4 | 1010 |

The full-document condition used 2376 model input tokens across the four tasks in
each run. Othie's three nonempty briefs used 183–199 Othie tokenizer tokens, and the
repository-only control returned `mode="empty"` in all three runs. The full-document
condition answered the enterprise weekend question as `12` each time; Othie answered
`6`, citing the enterprise support policy. The other two policy questions were correct
under both supplied-context conditions. The baseline answered only the arithmetic
control correctly. Citations in the three nonempty Othie results were relative source
labels (`s1/support.md`, `s1/refunds.md`, and `s1/telemetry.md`).

These results suggest the bounded context helped this model find a relevant exception
in this fixture set while using fewer answer-prompt tokens. They do not establish
accuracy on larger or adversarial corpora, on real coding tasks, or across models.
Othie's extraction calls are excluded from the input-token totals, so the table is
not an end-to-end cost or latency comparison. Extraction varied between runs; exact
quotation validation did not always produce a well-worded distilled rule, although
the accompanying excerpt carried the needed evidence. Ranking and packing can still
include a less relevant rule ahead of a relevant one.

An earlier strict-JSON answer-format probe caused this local model to produce
incomplete answers despite answering the same question correctly in plain text.
Answer format is therefore part of the evaluation protocol, not a product-quality
conclusion. The runner retains `--answer-format json` for that diagnostic.

## Hosted comparison and next gate

The existing `OPENAI_API_KEY` was used for one synthetic extraction probe with
`gpt-5.6-terra`. The API returned HTTP 429 with `credit_balance_exhausted`; no hosted
scored run was produced and no private indexed documents were sent. Once credits or
another authorized hosted provider are available, run the same four cases with the
hosted runtime before comparing models. The larger next gate is a real coding-agent
task set that measures answer quality, extra tool calls, latency, and no-op behavior
over more varied external context.

The evaluation runner and reproduction commands are in
[`packages/engine/evaluation/README.md`](../packages/engine/evaluation/README.md).
