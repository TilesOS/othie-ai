# Model context smoke evaluation

This small, synthetic comparison probes whether the current Othie pipeline helps a
model answer tasks that depend on policy outside the active repository. It is
not the roadmap's end-to-end coding-agent benchmark and is too small for a product
claim or a local-versus-hosted model decision.
The [2026-09-22 local result](../../../docs/context-delivery-smoke-evaluation-2026-09-22.md)
records three repeated runs and their limitations.

The runner creates three temporary policy documents, three unrelated reference
documents, and an isolated Othie profile.
It uses the selected model for Othie's rule extraction, then queries
the existing engine through its normal retrieval and packing path. Embeddings and
query-time synthesis are disabled, so this measures model extraction plus keyword
retrieval and deterministic packing. The same model answers four fixed tasks
under three conditions:

| Condition | Context supplied to the model |
| --- | --- |
| `baseline` | Task and repository fact only |
| `full_documents` | All six synthetic documents |
| `othie` | The engine's bounded XML context, or no context for an empty result |

The four cases include an external policy, a customer exception, an EU consent rule,
and a repository-only control that should trigger an Othie no-op. Short plain-text
answers are scored against fixed exact values; `--answer-format json` enables the
stricter schema diagnostic. The report records model responses, response IDs, host
token usage, Othie item counts, safe citation labels, and Othie's XML token count.
It does not record extraction token usage or prove that a coding agent would follow
the same context during a real tool-using task.

For a hosted run, use an existing `OPENAI_API_KEY` in the environment:

```sh
npm run eval:hosted --workspace=@othie/engine
```

If the key is in the ignored root `.env.local`, first build, then use Node's local
environment-file support:

```sh
npm run build --workspace=@othie/engine
node --env-file=.env.local packages/engine/dist/src/evaluation/hosted-baseline.js
```

The hosted default is `gpt-5.6-terra`. To run the same cases with an already installed
Ollama model, use:

```sh
npm run eval:local --workspace=@othie/engine
```

The Ollama default is `qwen3.5:4b-mlx`. Pass `--model MODEL_ID` to use another model
available to the selected runtime. Pass `--context-tokens 200` to test a smaller
Othie budget or `--case CASE_ID` to isolate one case; the default budget is 500.
The report includes the synthetic Othie XML for inspection and is written under the ignored
`packages/engine/evaluation/results/` directory. Pass `--out PATH` to choose another
new report file. The runner refuses to overwrite an existing report and deletes its
temporary source/index state after the run. Only synthetic documents and prompts are
sent to the selected model. Hosted and local responses use their respective APIs,
so compare answer correctness and context size before comparing runtime token counts.
