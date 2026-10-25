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

## Native coding-agent pilot

`npm run eval:native-agent` runs Codex CLI with its native shell and editing tools
under three conditions: task only (`baseline`), all eight synthetic company documents
(`full_documents`), and the compiled Othie prompt hook (`othie`). The separate seven-case
corpus preserves the four constrained-tool cases and adds expense documentation,
access-extension timing, and regional renewal defaults. One case is a repository-only
retrieval no-op. These are small single-function tasks, not a realistic multi-file benchmark.

```sh
npm run eval:native-agent -- --repeats 1 --out /tmp/othie-native-agent
```

The default requested model is `gpt-6-astra` with low reasoning effort. Pass `--model`
to select an available hosted model, `--cases support-targets,access-expiration` for
an explicit subset, `--context-tokens 200` for a lower engine cap, or `--timeout-ms`
for the per-session watchdog (default 180,000 ms). This pilot uses the existing
file-backed Codex login; it does not provision API keys or download models. Local
provider comparisons and Windows process/quoting acceptance are not implemented.

Each trajectory has a fresh Git workspace and disposable `CODEX_HOME`; only the
existing file login is copied. User configuration/rules, plugins and host skill
discovery are disabled. Tools use the workspace-write sandbox. The generated Othie
hook receives invocation-local trust only. Temporary credentials, homes, engines and
workspaces are removed afterward. Documents and hidden scoring probes are absent from
the workspace; instructions prohibit looking outside it. This is not proven isolation
from a hostile agent with host filesystem read access.

The agent must edit `solution.js` and run `node --test`. Public tests expose only
interface examples. Shared instructions live in the workspace's `AGENTS.md`; the
prompt hook receives the task itself. A separate resource-limited grader checks policy boundaries and
input preservation, irrespective of the final answer's success claim. Edited tests,
README/AGENTS changes, extra root files, solution symlinks, failed/incomplete native turns,
watchdog expiry, missing successful test-command events, and invalid hook receipts fail
the trajectory. Othie receipts must exactly match a fresh engine query for the actual
prompt, including strict content-free diagnostics and token accounting. A failed
retrieval no-op cannot count as correct even if the code passes all probes.

Condition order rotates across cases/repeats. A new output directory contains the
protocol before sessions, one immediately saved redacted trajectory per attempt, and
a final summary. Startup failures retain content-free stage metadata; existing output
directories are rejected. Protocols contain fixtures, hidden probes and compiled hashes;
trajectories contain native command events, hook receipts, final source, separate
operational/delivery/behavior scores and usage. Raw session identifiers, private paths
and rate-limit metadata are redacted. Session watchdogs terminate the native process
group, including shell-tool descendants.

Host input/output totals are cumulative usage reported by Codex across tool turns;
cached input is a separate reported field, and missing usage stays `null`. Local
`o200k_base` document/XML counts measure supplied evidence only and exclude the hook's
wrapper. They do not establish host token savings. Whole-session wall time includes
generation and tools. Shared engine state, caching, machine load, warm provider state
and the unpinned hosted snapshot prevent a controlled timing or general performance
claim. Model extraction, embeddings and synthesis remain disabled, so this pilot does
not close compiler-quality acceptance or interactive desktop trust.

## Native prompt-hook acceptance

`npm run eval:hook-default-latency -- --out /tmp/othie-hook-default-latency` measures compiled Codex
and Claude Code adapters against an isolated synthetic live engine without launching a
native host or model. Three repeats cover cited delivery, irrelevant-task silence, live
credential revocation and engine unavailability. Host order alternates between repeats.
The adapters use their default 2,000 ms deadline with deadline environment overrides
removed from child processes; parent timing includes spawn, module
loading, stdin, CLI/IPC, validation, output and exit. A separate 3,000 ms watchdog bounds
the adapter process. Every attempt must deliver the expected result and exit within
2,000 ms to pass. Pass `--repeats 1` through `10` to change the repeat count.

The new output directory preserves protocol, compiled artifact hashes, each attempt as
it finishes, and a final summary. Failures remain saved and exit nonzero. All providers
are disabled, so this measures lexical excerpt delivery and cannot establish semantic
applicability latency, model consumption, native host overhead, or desktop acceptance.
This preserves the October 14 normal-path baseline with one live engine. Use
`eval:hook-latency` for fresh engines and deadline/stall controls, or the native
session runner below for host/model acceptance.

Both latency CLIs reject unknown, duplicate and incomplete flags before creating run
state. A misspelled deadline option cannot silently measure a default-budget baseline;
the actual-default runner accepts only `--out` and `--repeats`.

`npm run eval:native-hooks -- --host claude-code --out /tmp/othie-native-claude` launches
the installed native host in noninteractive mode against an isolated synthetic engine.
The four sessions cover positive cited delivery, a repository-only no-op, live credential
revocation, and an unavailable engine. The default host model and existing host login
are used; host sessions may use the subscription/provider configured for that host.
No global hook configuration is changed. Claude Code receives explicit settings,
disables tools and MCP servers, and does not persist sessions.

Pass `--claude-settings project` or `--claude-settings local` to test discovery of
`.claude/settings.json` or `.claude/settings.local.json` in the isolated Git repository.
These modes omit `--settings`, exclude user settings, and load only project/local
sources. The default `--claude-settings explicit` retains the explicit-settings baseline.
Unknown, duplicate and incomplete CLI arguments are rejected before creating run state,
so a misspelled discovery option cannot silently select the explicit baseline.
Add `--launch-directory nested` to start either host below the project root in a
directory with spaces. Claude's shared project settings are read from the primary
working directory, while local settings can be read from the Git root on macOS.
Consequently a shared root settings file is a deliberate discovery boundary probe
when launching below that root; missing delivery fails the run and remains recorded.
See the official [settings locations](https://code.claude.com/docs/en/settings) reference.
Every run preserves `protocol.json` before the first session,
including configuration mode, launch directory and compiled-artifact hashes. Native
session wall times are recorded separately from the adapter's diagnostics; model
response time is not a hook-latency measurement. Positive delivery requires the entire
cited canary policy, including its first-response/resolution qualification.

```sh
npm run eval:native-hooks -- --host claude-code --claude-settings local --launch-directory nested --out /tmp/othie-native-claude-local
```

Noninteractive Claude Code skips the workspace trust dialog, so discovery acceptance
does not establish interactive hook approval or desktop UI acceptance. See the official
[hook trust reference](https://code.claude.com/docs/en/hooks#workspace-trust).

For Codex, pass `--host codex`, optionally with `--local-model qwen3.5:4b-mlx` to use an
installed loopback Ollama model. Codex receives an invocation-local hook configuration,
ignores user configuration, disables plugins, uses read-only tool permissions, and does
not persist its session. One-shot hook trust is bypassed only for the generated,
inspected acceptance hook; this does not test persisted `/hooks` trust. Pass
`--codex-hooks project` to probe `.codex/hooks.json` discovery instead of session configuration.
Project mode uses a private disposable `CODEX_HOME` with only the generated repository's
project trust in `config.toml`. It omits `--ignore-user-config` and all session hook/trust
overrides: the installed CLI gates project layers on trust from the user config before
applying session overrides. Hosted project runs copy the existing file-backed
`auth.json` into that temporary home with private permissions; the original login and
configuration are not modified. Keychain-only logins are not supported by this mode;
it fails before model sessions if no file login is available. Local-model project runs
do not copy authentication. The complete temporary home is removed in cleanup.
Project trust is distinct from hook trust, which still uses the one-shot bypass.
Add `--launch-directory nested` to test discovery below the trusted Git root.
Host skill discovery is suppressed through the installed CLI's experimental
feature switch; that behavior is version-dependent. The Codex runner currently rejects
Windows because command quoting has not had native Windows acceptance.

The wrapper forwards the native host event unchanged to the compiled adapter and stores
only its event name, field names, public model identity, adapter output, and content-free diagnostics. The
report separately requires correct adapter delivery and the expected native model
answer; adapter execution alone cannot establish that a host/model consumed the context.
Native stdout/stderr transcripts contain synthetic session metadata and may contain host
paths. Inspect/redact them before publishing. New output directories prevent overwriting
previous evidence. Temporary engines, credentials, and settings are removed after use.
Structured transcripts redact session/request identifiers, memory and socket locations,
and account rate-limit metadata in addition to literal fixture/repository/home paths.

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
provider for one complete decision per candidate using scoped task/evidence anchors.
The harness recovers full original quotations from these IDs. Unknown or cross-item
anchors, contradictory anchors, missing or duplicate decisions, deadlines and late
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

Semantic reports include every lexical baseline brief and its diagnostic score, candidate/selected counts,
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

## Candidate coverage and hook latency experiments

`--candidates source-revision` expands a lexical hit with the other extracted policy
rules in the same profile, document, revision, source and authority. It uses original
whole evidence, without matching filenames or generated labels. Global rules alone
do not seed expansion. This is evaluation-only overfetch: unrelated requirements from
a mixed-topic source can enter the candidate set. It does not establish semantic links
or change production relevance.

```sh
npm run eval:quality -- --corpus applicability --candidates source-revision --applicability semantic --temperature 0 --seed 42 --out /tmp/othie-source-candidates
```

New reports include pre-packing coverage diagnostics for both lexical and experimental
candidates, plus separate positive/no-op scores for packed output and the lexical baseline.
These distinguish candidate omissions from filtering and packing losses. Existing fixtures,
expectations and `quality-v5` quality scores remain unchanged.

Semantic runs also require filtering to finish within `--hook-deadline-ms` (default
2,000, matching the native hook default) for the overall `passed` gate. The independent
`quality_passed` gate preserves quality diagnostics. Requests still allow 20 seconds
so slow decisions remain available for inspection. Filtering time excludes hook stdin,
process startup, engine retrieval and transport: passing this necessary latency check
cannot establish end-to-end native-hook acceptance. Production hook behavior is unchanged.

## Stable recorded-input applicability replay

The replay runner reads an existing synthetic `quality.json` with `applicability-v3`
requests and an unchanged installed Ollama model digest. It sends the exact recorded
messages, candidate ordering, schema and sampling settings in the same case order on
each repeat. No extraction, fresh engine, candidate expansion or re-ranking occurs.
It rejects changed prompts/schemas, ambiguous cases/anchors, and evidence absent from
retained authoritative originals. Empty-candidate cases have no recorded model call
and are listed separately. The default replays all nonempty requests three times:

```sh
npm run build --workspace=@othie/engine
node packages/engine/dist/src/evaluation/applicability-replay.js --input packages/engine/evaluation/records/2026-10-06/applicability-followup/anchors-1/quality.json --out /tmp/othie-fixed-replay
```

Pass `--cases receipt-boundary,consent-negation` for an explicitly recorded subset,
`--repeats 3` for repeat count, or `--generation-deadline-ms 2000` to actually cancel
calls at a hook-sized model budget. The default generation deadline is 20 seconds,
while `--hook-deadline-ms` defaults to 2,000 for independent latency gating.

A new output directory contains `protocol.json`, a raw attempt file saved after every
call, and `summary.json` after completion. Requests receive identity hashes. Summaries
count distinct applicability decision sets separately from explanation wording and
compare decisions against the recording. Recorded pre-packing diagnostic scores
are also retained as a baseline. Invalid/late attempts fail atomically and
remain inspectable. Scores measure source, qualifier and explicit-conflict diagnostics
**before packing**; they are not the packed `quality-v5` acceptance totals. Warm runtime
state remains uncontrolled, and repeats are not independent samples. Both semantic
quality and native-hook latency acceptance remain necessary before production use.

## Complete adapter-process latency

`npm run eval:hook-latency -- --out /tmp/othie-hook-latency` launches both compiled
prompt adapters directly against a fresh synthetic engine, index and credentials on
each of three repeats. It requires local IPC socket access and no model or host login.
Extraction, embeddings and synthesis are disabled; the positive case uses cited
lexical excerpts. This is adapter-process evidence, not native-host or semantic-filter
acceptance.

The fixed cases cover positive delivery with the first-response qualification intact,
a repository-only no-op, a stalled authenticated engine request, delayed stdin followed
by a stalled request, stdin that never closes, live revocation, and an unavailable
engine. Both engine-stall cases must reach the authenticated engine before they can
pass. Input and engine stalls must return no context with a timeout diagnostic.

The parent measures time from before process spawn until process close, including
module initialization, stdin, CLI startup, IPC, validation and output. Each raw attempt
also preserves the adapter's content-free diagnostic and its internal elapsed time.
Normal delivery/no-op/failure paths must complete within `--deadline-ms` (default
2,000). Stall controls consume the adapter's internal deadline, including Node startup,
and must exit before `--host-timeout-ms` (default 3,000), allowing for cleanup. The
outer watchdog kills over-budget adapters and fails the attempt. Timer scheduling
does not guarantee exact millisecond termination.

Pass `--repeats 1` for a single observation. A new output directory contains
`protocol.json`, an attempt file written immediately after every invocation, and
`summary.json` after completion. The protocol records runtime, fixture and compiled
entry-point hashes, budgets and condition/host order. Existing output directories are
rejected before an engine starts. All fixtures are synthetic; credentials, temporary
paths and host session metadata are excluded. Failed attempts remain in the record,
behavior and latency are scored separately, and any failed attempt makes the CLI exit
nonzero. Fresh engine state does not control machine load or runtime warm state, and
these local repeats are not statistical or cross-platform acceptance.
