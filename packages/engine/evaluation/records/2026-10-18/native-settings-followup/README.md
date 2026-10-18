# Native Claude settings discovery

Recorded October 18, 2026 on macOS with Node.js 24.18.0, Claude Code 2.1.283,
and the host's existing `claude-opus-5-5` default. These are synthetic native CLI
sessions against isolated live engines. Extraction, embeddings and synthesis are
disabled; Othie supplies cited lexical excerpts under a 500-token cap. No models
were downloaded, and no global hook configuration or persisted trust was installed.

The harness was added in `b75d3dd`. Transcript metadata redaction was added in
`2fe3015`; the three root runs preceded that change. All six runs use the same
compiled adapter, shared runtime and CLI hashes recorded in their protocols.

| Settings supplied | Launch directory | Delivery and answer checks |
| --- | --- | --- |
| [Explicit settings path](explicit/summary.json) | Repository root | 4/4 pass |
| [Shared `.claude/settings.json`](project-root/summary.json) | Repository root | 4/4 pass |
| [Local `.claude/settings.local.json`](local-root/summary.json) | Repository root | 4/4 pass |
| [Shared root settings](project-nested/summary.json) | Nested directory | 0/4 pass; no hook receipt |
| [Local root settings](local-nested/summary.json) | Nested directory | 4/4 pass |
| [Explicit settings path](explicit-nested/summary.json) | Nested directory | 4/4 pass |

Each run launches four fresh native sessions: positive policy context, a repository-only
no-op, live credential revocation, and engine unavailability. Positive acceptance requires
the complete canary policy with its qualification and citation in adapter output, plus
the model's answer `11`. The other answers must be `42`, `unknown`, and `unknown`, with
the corresponding content-free adapter outcome and empty context. Native tools and MCP
servers are disabled. A correct no-op answer without an adapter receipt cannot pass.

Discovery runs use `--setting-sources project,local` and omit `--settings`. Both shared
and local files are placed at the isolated Git root. Nested launches start two levels
below that root in a directory with spaces. Shared root settings are not discovered in
that launch mode: the positive answer is `unknown`, and all four sessions lack a receipt.
Those failures remain scored as failures. Local root settings and an explicit settings
path both work from the nested launch directory. The official
[settings reference](https://code.claude.com/docs/en/settings) documents that shared
settings use the primary working directory while local settings can use the Git root.
Start Claude at the root to use shared root settings, or supply an explicit settings path.

The 20 sessions with hooks report internal adapter times of 253–371 ms. Complete
native process time, including model response generation, ranges from 2,549 to
10,797 ms across all 24 sessions. These measure different boundaries: neither the
internal diagnostics nor complete model session time establishes a native hook's
full process budget. See the separate compiled-adapter latency records for that gate.

The serial [fresh-engine evaluator](fresh-engine/summary.json) passes 14/14 attempts
at the default 2,000 ms internal budget and 3,000 ms outer watchdog, including
authenticated stalls, delayed input and unclosed stdin. Complete adapter process times
are 269–2,037 ms; stall controls must finish within the outer watchdog. The separate
[actual-default evaluator](default-budget/summary.json) passes 8/8 normal attempts
in 315–442 ms. These runs follow workspace checks without overlapping build/test work.
Both hosts' compiled adapters are tested, independent of the installed Codex CLI version.

The [verification record](verification.json) and [workspace checks](checks/checks.json)
preserve successful build, typechecks, website lint, 175 deterministic tests and one
skipped opt-in real-model test. The production audit reports zero advisories. Dependencies
were not changed or reinstalled. The [merged CI record](checks/merged-ci.json) confirms
both macOS and Windows jobs pass for `449c3fc`; the new local commits still need CI.
The [manifest](manifest.json) hashes the published evidence and normalized check logs.

Final harness review added strict CLI argument parsing in `2f15b20`: unknown, duplicate
and incomplete flags now fail before run state is created, preventing an accidental
explicit-baseline run when a discovery flag is mistyped. Final
[workspace typechecks](checks/final-typecheck.txt) and the [full suite](checks/final-tests.txt)
pass with 176 deterministic tests and one opt-in real-model test skipped. Valid native
invocation behavior is unchanged; the native sessions were not repeated for this guard.

Reproduce each run with a new output directory:

```sh
npm run eval:native-hooks -- --host claude-code --claude-settings explicit --out /tmp/othie-explicit
npm run eval:native-hooks -- --host claude-code --claude-settings project --out /tmp/othie-project-root
npm run eval:native-hooks -- --host claude-code --claude-settings local --out /tmp/othie-local-root
npm run eval:native-hooks -- --host claude-code --claude-settings project --launch-directory nested --out /tmp/othie-project-nested
npm run eval:native-hooks -- --host claude-code --claude-settings local --launch-directory nested --out /tmp/othie-local-nested
npm run eval:native-hooks -- --host claude-code --claude-settings explicit --launch-directory nested --out /tmp/othie-explicit-nested
```

The shared/nested command exits nonzero. Every protocol, individual condition, native
transcript, adapter receipt and summary is retained. The [publication record](publication.json)
hashes original local files and published copies. Publication redacts account rate-limit
metadata, native identifiers, memory/socket locations and literal host paths without
changing answers, receipts, scores or timings. Earlier reports are preserved in place.

Noninteractive Claude treats the generated workspace as trusted, as described in the
[hook trust reference](https://code.claude.com/docs/en/hooks#workspace-trust). This is not
interactive workspace approval or desktop UI acceptance. No new Codex sessions, local-model
consumption, semantic applicability, native Windows sessions, logon startup, installers,
or larger coding-agent benchmark were evaluated by these native runs. The installed
Codex CLI reports 0.145.0; the earlier native evidence used 0.156.1, so that historical
acceptance is not extended to this installed version.
