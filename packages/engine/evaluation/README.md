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

## Tool-using coding-agent evaluation

`npm run eval:agent` runs an installed Ollama model against four fixed JavaScript tasks
under `baseline`, `full_documents`, and `othie` conditions. It never downloads a model,
uses no hosted API, and sends only synthetic fixtures to loopback Ollama. The default
model is `qwen3.5:4b-mlx`.

```sh
npm run eval:agent -- --repeats 3 --context-tokens 500 --out /tmp/othie-agent-run
```

Each condition receives a fresh two-file workspace. The model repeatedly calls
`read_file`, `write_file`, and `run_tests` through a JSON action protocol, then finishes.
It cannot access company documents through tools, alter tests, or execute shell commands.
Public probes check the interface; separate hidden probes check behavior, numeric
boundaries, exceptions, consent negations, and preservation of input arguments. A run
that hits the turn limit or loses its model request fails even if its final code happens
to pass. The repository-only sorting task is an explicit retrieval no-op control.

The runner fixes model digest, fixture hash, generation options, and per-repeat seed.
It rotates condition order to distribute warm-model effects, recounts engine XML against
the requested cap, and verifies that the installed model digest has not changed. For
this first benchmark, Othie uses real indexing, lexical retrieval, and cited excerpt
packing with model extraction, embeddings, and synthesis disabled. This isolates context
selection from compiler-model quality. Navigation hints have no verified producer yet,
so the planned fourth condition is deferred.

The output directory must be new. `protocol.json` preserves fixtures, hidden probes,
model identity, and limitations. Each trajectory is saved immediately with initial
messages, raw model actions, tool results, final code, objective scores, input/output
tokens, tool calls, and elapsed time. `summary.json` is written only after all trajectories
complete. Incomplete evidence remains available after failure; temporary source/index
and code workspaces are removed. Token totals are cumulative model-reported prompt
counts across tool turns, not a single prompt's size; missing usage is `null`.

This is a small constrained-tool agent benchmark, not native Codex/Claude Code acceptance
or a general performance claim. Repeats at temperature zero are not independent samples.
Code grading uses a separate resource-limited Node process with permissions enabled,
no inherited environment, and a VM without host objects. That is defense in depth for
synthetic local experiments, not a general sandbox for arbitrary untrusted programs.

## Native prompt-hook acceptance

`npm run eval:native-hooks -- --host claude-code --out /tmp/othie-native-claude` launches
the installed native host in noninteractive mode against an isolated synthetic engine.
The four sessions cover positive cited delivery, a repository-only no-op, live credential
revocation, and an unavailable engine. The default host model and existing host login
are used; host sessions may use the subscription/provider configured for that host.
No global hook configuration is changed. Claude Code receives explicit settings,
disables tools and MCP servers, and does not persist sessions.

For Codex, pass `--host codex`, optionally with `--local-model qwen3.5:4b-mlx` to use an
installed loopback Ollama model. Codex receives an invocation-local hook configuration,
ignores user configuration, disables plugins, uses read-only tool permissions, and does
not persist its session. One-shot hook trust is bypassed only for the generated,
inspected acceptance hook; this does not test persisted `/hooks` trust or project-file
discovery. Host skill discovery is suppressed through the installed CLI's experimental
feature switch; that behavior is version-dependent. The Codex runner currently rejects
Windows because command quoting has not had native Windows acceptance.

The wrapper forwards the native host event unchanged to the compiled adapter and stores
only its event name, field names, adapter output, and content-free diagnostics. The
report separately requires correct adapter delivery and the expected native model
answer; adapter execution alone cannot establish that a host/model consumed the context.
Native stdout/stderr transcripts contain synthetic session metadata and may contain host
paths. Inspect/redact them before publishing. New output directories prevent overwriting
previous evidence. Temporary engines, credentials, and settings are removed after use.

## Compiler-quality corpus

`npm run eval:quality -- --model qwen3.5:4b-mlx --out /tmp/othie-quality-run` evaluates
an already installed local model with six authoritative documents and one adversarial
vendor reference. Seven retrieval cases at both 200 and 500 tokens cover approval and
medical exceptions, receipt thresholds, contractor entitlements, consent negations,
opposing CSV rules, reference injection, and a repository-only no-op. This runs actual
model extraction and rules-only retrieval; excerpts cannot mask extraction failures.

The report preserves input fixtures, raw generations, retained rules, exact-citation
checks, missing source/qualifier diagnostics, packed briefs, extraction/retrieval latency,
model digest, prompt version, and artifact license metadata. It refuses to overwrite an
existing output directory and verifies the model digest again afterward. A separate
`generations.json` preserves responses if a later evaluation step fails.

Qualifier regexes score compressed rule text and scope separately from supporting
quotations. They are lexical diagnostics, not semantic entailment or proof that all
claims are supported. Inspect the raw proposals and retained rules. A missing conflict
flag is recorded in each brief; this does not imply the limited detector can resolve
natural-language scope/category differences. Model redistribution license/notice review
is recorded as pending, not inferred from a model tag or license string.

`RUN_OTHIE_MODEL_TESTS=1 npm run test:models` now executes this corpus instead of a TODO.
Set `OTHIE_MODEL` for another installed model and `OTHIE_MODEL_RESULTS` to a new output
directory to retain the report. The opt-in suite gates operational completion, exact
citations, token accounting, and reference isolation; it prints quality diagnostics
separately. The evaluation CLI exits nonzero when any source/qualifier diagnostic fails.
The normal deterministic suite skips the live-model run and requires no model download.
