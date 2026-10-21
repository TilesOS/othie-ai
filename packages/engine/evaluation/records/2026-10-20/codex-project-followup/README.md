# Native Codex project discovery

Recorded October 20, 2026 on macOS arm64 with Node.js 24.18.0 and Codex CLI 0.156.1.
The 20 native sessions use isolated synthetic documents and a live Othie engine with
extraction, embeddings and synthesis disabled. No model was downloaded or distributed.

| Configuration | Model | Launch | Delivery and answer checks |
| --- | --- | --- | --- |
| [Original project mode](project-override-failure/summary.json) | Host default; no receipt model | Root | 0/4; no hook receipts |
| [Trusted project file](project-root/summary.json) | `gpt-6-astra` | Root | 4/4 |
| [Trusted project file](project-nested/summary.json) | `gpt-6-astra` | Nested | 4/4 |
| [Invocation-local baseline](session-baseline/summary.json) | `gpt-6-astra` | Root | 4/4 |
| [Trusted project file, local model](local-project/summary.json) | `qwen3.5:4b-mlx` | Root | 3/4; positive answer remains `unknown` |

Every run checks positive policy context, a repository-only no-op, live credential
revocation and engine unavailability. Positive acceptance requires the complete canary
policy, its first-response/resolution qualification and citation in the adapter receipt,
plus native answer `11`. The other answers must be `42`, `unknown` and `unknown`, with
the corresponding content-free diagnostics and empty output. Correct answers without
receipts do not pass. The original failed probe and local-model failure remain scored
as failures, giving 15/20 passing conditions overall.

## Project trust and hook discovery

The original harness passes project trust through `-c` while ignoring user configuration.
It never enables the project layer in this installed CLI. The offline
[configuration-layer probe](checks/config-layer-probe.txt) shows that a session trust
override leaves the project layer disabled, with an explicit instruction to record trust
in the user's config. A minimal disposable home's `config.toml` containing that project
trust enables the layer. The [probe script](config-layer-probe.mjs) uses the installed
app-server's `config/read` method without a model call. Only layer names, disabled reasons
and configuration key names are printed; startup stderr is not retained.

Commit `5182d18` repairs project mode by creating a private temporary `CODEX_HOME` and
recording trust for the generated Git repository there. It omits `--ignore-user-config`
and all session hook/trust overrides, so the project hook cannot be supplied by an
invocation-local fallback. Hosted runs copy the existing file login into the temporary
home with mode 0600; the home has mode 0700. The original login and configuration are
not edited, and the complete temporary home is removed afterward. Keychain-only logins
are unsupported in hosted project mode. Local-model runs copy no login.

Both trusted project runs discover `.codex/hooks.json` at the Git root, including a launch
two levels below it in a directory with spaces. All four root and all four nested checks
pass. The separate invocation-local baseline also passes 4/4. Hook trust still uses a
one-shot bypass for the inspected generated hook, as described in the official
[hook guide](https://learn.chatgpt.com/docs/hooks). This verifies noninteractive project
discovery, not interactive persisted hook approval, its invalidation after edits, or
desktop UI acceptance.

The archived original probe was recorded before the provenance-label fix in `a327a0a`.
Its protocol identifies project mode, but its summary's trust text incorrectly says
invocation-local. That original metadata is retained with this correction documented.
The [restricted-attempt protocol](restricted-attempt/protocol.json) also remains: that
attempt stopped before the first native session, then the harness was rerun with native
host/local-socket access.

## Local model and measurement boundaries

All four local-model sessions execute the adapter with the expected cited/empty outcomes.
The positive native answer is still `unknown`, with reasoning claiming no supplied
context; the other three answers pass. Adapter delivery alone does not prove model
consumption. This run does not isolate host request construction, provider handling or
model behavior as the cause.

The installed model digest remains
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`, matching the
earlier October 3/October 8 identity. The [post-run model identity](checks/model-identity.json)
records it. Loopback Ollama 0.35.1 was started temporarily and stopped after the sessions.
No new model artifacts or global hook/trust configuration were installed.

The 16 native sessions with receipts report 249–291 ms of internal adapter time. Complete
native sessions across all 20 attempts take 2,020–6,638 ms, including model response time.
Neither boundary measures a complete hook process as seen by its native host.

After build/test work and native sessions completed, the serial
[fresh-engine evaluator](fresh-engine/summary.json) passes 14/14 conditions at the
actual 2,000 ms internal/3,000 ms outer budgets, including authenticated engine stalls,
delayed input and unclosed stdin. Complete adapter process times are 257–2,038 ms;
stall controls use the outer watchdog. The separate [actual-default baseline](default-budget/summary.json)
passes 8/8 normal paths in 256–276 ms. These are synthetic lexical adapter measurements,
excluding native-host overhead and semantic filtering.

## Verification and reproduction

Commits `a327a0a` and `5182d18` add native thread/turn identifier redaction, correct hook
provenance reporting and isolated project trust. Commit `bc0ca91` shares strict argument
parsing across all three acceptance CLIs. Unknown, duplicate and incomplete flags now
fail before creating run state. A compiled-CLI regression covers all three runners,
including a misspelled deadline option. The [unguarded CLI probe](unguarded-cli-probe/protocol.json)
preserves an earlier `--help` invocation which unexpectedly selected the strict latency
baseline and stopped before any scored condition under restricted socket access.

The [verification record](verification.json) links the scope and measured gates.
Full production [build](checks/build.txt), final workspace [typechecks](checks/final-typecheck.txt),
website [lint](checks/website-lint.txt), [production audit](checks/production-audit.json)
and [178 deterministic tests](checks/final-tests.txt) pass. One opt-in real-model test
is skipped; production audit reports zero findings. Installed dependencies were unchanged,
and `npm ci` was not repeated. Earlier checks before the final CLI guard are also retained.
Native sessions precede the shared-parser refactor; valid native flags are unchanged,
and the final suite/typechecks cover that refactor. Both standalone latency runs follow it.

Reproduce with new output directories after building the engine and integrations:

```sh
npm run eval:native-hooks -- --host codex --codex-hooks project --out /tmp/othie-codex-project
npm run eval:native-hooks -- --host codex --codex-hooks project --launch-directory nested --out /tmp/othie-codex-nested
npm run eval:native-hooks -- --host codex --codex-hooks session --out /tmp/othie-codex-session
npm run eval:native-hooks -- --host codex --codex-hooks project --local-model qwen3.5:4b-mlx --out /tmp/othie-codex-local
npm run eval:hook-latency -- --repeats 1 --out /tmp/othie-strict-latency
npm run eval:hook-default-latency -- --repeats 1 --out /tmp/othie-default-latency
```

The local-model command still exits nonzero. Reproducing the original project-trust
failure requires the earlier harness in `51e45f8`; current project mode uses the repair.
The [publication record](publication.json) hashes original local files and published
copies; redactions remove host/fixture paths and native identifiers without changing
scores, answers, receipts or timings. The [manifest](manifest.json) hashes all published
evidence. Website browser/UI, fresh remote CI, semantic quality, native Windows sessions,
logon startup and signed installer acceptance were not evaluated in this follow-up.
