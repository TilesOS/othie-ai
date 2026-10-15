# Startup-inclusive hook latency follow-up

Recorded October 14, 2026 (America/New_York) on Linux with Node.js 24.19.0.
All documents and prompts are synthetic. No model is launched or downloaded.

## Deadline enforcement

Code `b2279cd` starts the compiled adapters' deadline at Node's performance time
origin. Module loading, stdin, CLI/IPC and validation share that budget. Previously,
module loading occurred before the internal timer and its elapsed-time diagnostic.
An expired startup budget now skips the CLI; a partially consumed budget cannot
restart when querying. Late results still fail open without context.

Two compiled-process regressions preload a 400 ms delay with a 300 ms budget, one
for each adapter. Both return `context_timeout`, report startup time and leave the
CLI marker absent. The preload uses a file URL for Windows compatibility; the
27 hook tests pass again after that portability correction (`26f3e67`). Shared
timer tests verify exhausted and partially spent budgets.
These checks do not make synchronous module loading interruptible: the host's outer
timeout remains necessary to bound process lifetime.

## Measured delivery

`npm run eval:hook-latency` measures from the parent before spawn through process
exit. It uses a synthetic live engine, no extraction/embedding/synthesis providers,
and the compiled adapters' default deadline without inherited deadline overrides.
Fresh adapter and CLI processes run for every attempt. The engine stays warm until
the unavailable condition; this is a small lexical excerpt workload.

The [initial probe](initial-probe/summary.json), code `b4f0417`, passes eight attempts
in 572–951 ms. The [final protocol](default-budget/protocol.json) and
[summary](default-budget/summary.json), code `7b5ee06`, preserve three serial repeats
with alternating host order. All 24 attempts pass delivery and the 2,000 ms wall-time
gate, including cited positive context, irrelevant-task silence, live grant revocation
and unavailable-engine silence. Parent timings include startup, stdin, CLI/IPC,
validation, output and exit. No build/test work overlapped the final timing run.

| Adapter | Passing attempts | Parent wall time |
| --- | ---: | ---: |
| Codex | 12/12 | 578–654 ms |
| Claude Code | 12/12 | 580–662 ms |

Every attempt is saved before the next one starts. Protocols hash compiled entry
points and runtime; existing output directories are refused. The evaluator regression
sets both inherited deadline overrides to 1 ms, verifies use of the actual defaults,
checks saved attempts against the summary, and confirms refusal to overwrite evidence.
Its CI assertion checks reporting and delivery behavior rather than requiring a
particular machine speed. The opt-in evaluator's acceptance gate remains 2,000 ms.

These are adapter-process observations, not native Codex/Claude Code sessions, model
consumption, desktop acceptance or a general latency guarantee. Semantic applicability
is not enabled and its recorded recall/latency failures remain unresolved. Native host
overhead would have to be measured separately before claiming end-to-end host acceptance.

## Verification and CI

The [verification record](verification.json) and [check outputs](checks/tests.txt)
record clean installation, production build, workspace typechecks, website lint,
164 passing deterministic tests, one skipped opt-in model test, and zero production
dependency advisories. The initial restricted-sandbox test attempt failed on socket
and child-process access; its output is preserved. Both the baseline and final suites
pass with required local access. Generated website type references were restored after
the build. No website UI, native host or model acceptance was repeated.

The [inspected CI jobs](ci.json) for
[`7eb19f8`](https://github.com/TilesOS/othie-ai/actions/runs/37877299841)
pass on both macOS and Windows: clean installation, workspace typechecks, tests and
Windows startup-script syntax. This closes the pending CI inspection for the October 8
changes. The new local hook commits still require their own CI. Native Windows host
and logon-startup acceptance remain open.

The [manifest](manifest.json) records evidence hashes. Initial probe output and failed
sandbox output remain intact; earlier model evaluations and expectations are unchanged.
