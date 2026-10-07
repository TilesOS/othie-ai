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
inspected acceptance hook; this does not test persisted `/hooks` trust. Pass
`--codex-hooks project` to probe `.codex/hooks.json` discovery instead of session configuration. Host skill discovery is suppressed through the installed CLI's experimental
feature switch; that behavior is version-dependent. The Codex runner currently rejects
Windows because command quoting has not had native Windows acceptance.

The wrapper forwards the native host event unchanged to the compiled adapter and stores
only its event name, field names, public model identity, adapter output, and content-free diagnostics. The
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
`generations.json` preserves responses if a later evaluation step fails. New runs also
record each request's output schema and generation options for replay.

Protocol `quality-v5` additionally compares retained original sentences with the fixed
corpus's expected policy sentences. Every authoritative sentence in the standard corpus
is expected; extended mixed-policy documents declare their policy sentence numbers.
Missing policy or retained non-policy/reference sentences fail this diagnostic independently
of the retrieval cases. This is fixture-specific coverage, not a general semantic classifier.
Reports include durable extraction-job states and attempt counts, so successful retries
are visible. The `rules-v12` extractor classifies every sentence with a short explanation in one
request, then derives policy evidence deterministically in source order. It recovers
every classified policy sentence, attaching syntactic qualifications without crossing
classified non-policy boundaries. No second selector can contradict these decisions.
Classification is model judgment and can still misclassify policy; explanations are
inspection data and never exported evidence. Fixed category/applicability metadata
makes no generated subject or scope claim. Implicit evidence links remain open.

Pass `--temperature 0 --seed 42` to send explicit Ollama sampling settings for all
classification requests. Omitted options retain runtime defaults. Reports record the
requested settings and each generation's effective options. Controlled settings do not
guarantee identical outputs or make repeats independent samples. Existing production
compiler configuration and defaults are unchanged.

`--applicability semantic` runs an evaluation-only filter after lexical candidate
selection and before whole-rule packing. It asks the same approved local extraction
provider for one complete decision per candidate with exact task/evidence quotes.
Unknown IDs, missing or duplicate decisions, invented quotations, deadlines and late
results fail the case at both caps; the baseline remains in the report for inspection.
Empty candidate sets skip generation. Global rules remain unconditional. Retained
rules, ranking and quotations are original engine objects; model explanations never
enter exported context. One decision set is reused at both caps. This experiment
does not change normal engine delivery or enable query exports in production.

The separately scored `--corpus applicability` extends the unchanged boundary corpus
with eight positive tasks (including single-subject queries and explicit opposing rules)
and four descriptive/history/UI no-op controls. It uses the same source documents,
the same coverage expectations and `quality-v5` diagnostic scoring:

```sh
npm run eval:quality -- --corpus applicability --applicability semantic --temperature 0 --seed 42 --out /tmp/othie-applicability-run
```

Semantic reports include every lexical baseline brief, candidate/selected counts,
complete decisions, per-query latency, generation stages, prompt version and requested
sampling settings. Structural quote validation does not prove semantic applicability;
the filter cannot recover policies absent from lexical candidates. Compare false
positives and lost qualifiers together before considering production use.

The default `--corpus standard` preserves the original seven-case input. Pass
`--corpus extended` to add four authoritative documents and six cases covering regional
defaults, descriptive facts and model instructions embedded in authoritative sources,
linked access extensions, long whole-rule evidence, and two additional no-op controls:

```sh
npm run eval:quality -- --corpus extended --out /tmp/othie-quality-extended
```

The extended corpus deliberately probes the 200-token cap with a long incident-report
requirement. A hard cap can correctly omit that complete rule while the quality diagnostic
fails; passing token accounting does not establish evidence completeness. Both corpora
use actual extraction and the same 200/500-token retrieval path.

Pass `--corpus adversarial` for a separately scored superset with six more authoritative
documents and eight cases: appearance/history facts, a quoted museum title containing
"must", varied model instructions, legitimate assistant-use restrictions, an all-non-policy
source, and qualification attachment next to descriptive text. Standard and extended
fixtures and scoring are unchanged. This corpus has 21 retrieval cases and 16 authoritative
documents, including one that should produce no rules.

```sh
npm run eval:quality -- --corpus adversarial --out /tmp/othie-quality-adversarial
```

Pass `--corpus boundaries` for the adversarial corpus plus four documents and seven
cases checking active quoted policy, historical replacement, human assistant-use policy,
conditional procedures, and display/example/instruction no-op controls. The 20
authoritative documents and 28 cases use the same `quality-v5` scoring. This separately
scored superset checks that quoted-history guidance does not suppress active quoted
requirements or legitimate organizational restrictions on assistant use.

Protocol `quality-v4` introduced qualifier regexes against packed rule text and supporting
quotations from the case's expected sources, excluding generated category/scope labels.
Numeric words use boundaries so "written" cannot satisfy "ten". The intermediate
`quality-v3` excluded labels but still allowed unrelated sources to satisfy qualifiers.
Older `quality-v2` reports counted scope wording, which could mask omitted evidence.
These are lexical diagnostics, not
semantic entailment or proof that all claims are supported. Inspect the raw selections
and retained rules. Since `quality-v2`, scoring also requires an explicit conflict flag
for the opposing-export case; old `quality-v1`
reports did not include that flag in their pass/fail score. This does not imply the limited detector can resolve
natural-language scope/category differences. Model redistribution license/notice review
is recorded as pending, not inferred from a model tag or license string.

`RUN_OTHIE_MODEL_TESTS=1 npm run test:models` now executes this corpus instead of a TODO.
Set `OTHIE_MODEL` for another installed model and `OTHIE_MODEL_RESULTS` to a new output
directory to retain the report. The opt-in suite gates operational completion, exact
citations, token accounting, and reference isolation; it prints quality diagnostics
separately. The evaluation CLI exits nonzero when any source/qualifier/conflict diagnostic fails.
The normal deterministic suite skips the live-model run and requires no model download.

The [October 4 compiler records](records/2026-10-04/compiler-followup/README.md) preserve
five runs, including three final `quality-v4` repeats (14/14, 12/14, 14/14). Both conflict
sides fit at 200 tokens in every final repeat. The failed repeat omits the non-EU telemetry
default during extraction, failing at both caps; consistent selection remains open.

The [coverage follow-up records](records/2026-10-04/coverage-followup/README.md) preserve
18 further evaluations and the retained `rules-v6` implementation. Final standard repeats
pass 42/42 retrieval diagnostics with every expected policy sentence retained. Final
extended repeats each pass 19/26; non-policy/model-instruction promotion fails no-op checks
at both caps, and long whole-rule evidence fails at 200 tokens. Passing bookkeeping and
the standard corpus do not establish semantic classification acceptance.

The [October 5 classification records](records/2026-10-05/classification-followup/README.md)
preserve 11 full evaluations and two isolated probes. `rules-v9` standard repeats pass
42/42 and extended repeats pass 75/78 with exact expected sentence coverage. The larger
adversarial corpus still fails on operational completion, quoted-history classification,
generic word relevance, and crowded 200-token packing. A single previous-extractor
comparison scores 28/42 versus 38/42 in each completed new-extractor repeat; an additional
new-extractor repeat reaches the deadline. These observations do not establish reliable
general classification or a controlled latency/quality advantage.

The [deterministic follow-up records](records/2026-10-05/deterministic-followup/README.md)
preserve 26 full evaluations. `rules-v12` final repeats score 42/42 standard, 75/78 extended,
123/126 adversarial, and 153/168 boundaries. All jobs finish in one attempt. Standard,
extended, and adversarial repeats have exact expected sentence coverage; the wider
boundaries corpus still has one instruction-promotion coverage failure and two semantic
relevance no-op failures at both caps. Long complete incident evidence fails at 200
tokens throughout. Earlier entitlement/assistant-permission omissions remain recorded.
These results do not establish general semantic classification or prompt-injection safety.
