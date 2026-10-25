# Native coding-agent pilot and late-query retrieval

Recorded October 24–25, 2026 on macOS arm64 with Node.js 24.18.0 and Codex CLI
0.156.1. The requested hosted model is `gpt-6-astra`, with low reasoning effort;
all seven Othie receipts identify that model. Hosted provider snapshots, caching and
warm state are not pinned. All documents, tasks and scoring probes are synthetic.

Implementation commits are `e2b083b` (separate fixtures), `897f0cb` (native runner),
`554cd58` (query-term preservation), and `c503ecf` (complete policy coverage and
test-event scoring). Commit `1873103` records refreshed CI for the preceding history.

## Final native comparison

The [final protocol](final/protocol.json) records seven tasks, eight external documents,
one repeat and rotating condition order. Every trajectory uses native Codex shell/edit
tools, a fresh Git workspace and disposable login home. Shared instructions are in
`AGENTS.md`; the prompt hook receives the task itself. Only `solution.js` is editable.
Public interface tests are available in the workspace. Separate behavioral probes run
in the existing resource-limited grader after the native session, with no inherited
environment or VM host objects.

| Condition | Fully correct tasks | Behavioral probes | Operational checks | Reported input tokens | Reported cached input tokens | Reported output tokens |
| --- | --- | --- | --- | --- | --- | --- |
| Task only | 3/7 | 31/46 | 7/7 | 428,517 | 391,552 | 3,135 |
| Full documents | 7/7 | 46/46 | 7/7 | 439,695 | 389,120 | 2,395 |
| Othie | 7/7 | 46/46 | 7/7 | 438,018 | 386,688 | 2,555 |

The [summary](final/summary.json) links every trajectory, final implementation, native
command stream, hook receipt and score. All 21 sessions complete, preserve tests and
repository instructions, and produce successful public-test command output. Othie
delivers every sentence of the expected policy document in all six positive cases and
injects nothing for the repository-only control. Exact adapter output, strict diagnostics,
local XML token accounting and the 500-token cap pass. Transport and fixed-policy
coverage are scored separately; a receipt for unrelated evidence cannot pass coverage.

Task-only implementations miss support targets (0/6 probes), a refund boundary (6/7),
expense documentation (4/6), and access-extension conditions (3/9). They pass telemetry,
renewal and the sorting control; their transcript assumptions remain visible. Success
without supplied policy can reflect a correct guess. `all_correct` is false and the
benchmark CLI exits 1 because four task-only comparators fail; the run is complete.

Host usage is cumulative across tool turns, with cached input reported separately.
It is not evidence-token size or an uncached billing calculation. Summed local evidence
counts are 2,912 tokens for full documents and 2,362 for Othie, excluding the hook wrapper.
The differing native turns, cache counts and unpinned hosted execution support no
controlled token-saving or timing claim. These small single-function fixtures extend
the earlier constrained-tool benchmark to native tools; realistic multi-file tasks,
further repeats, other models and broader quality acceptance remain open. Extraction,
embeddings and synthesis are disabled, so this run does not validate model compilation.

## Preserved initial failure and isolated regression

The [initial support pilot](pilot/summary.json), protocol `native-agent-v1`, puts the
shared instructions before the task in the user prompt. Task-only and Othie code each
pass 0/6 probes; full documents pass 6/6. The Othie adapter transports the engine result
exactly, but that result contains brand excerpts and no support policy. Its original
`delivery_passed` field measures transport, not expected-policy coverage. All three
sessions complete and run public tests. This unsuccessful pilot is excluded from the
final comparison.

The lexical helper previously kept only the first 20 distinct meaningful terms. In
the 850-character initial prompt, those terms stop before `support`. The
[same-input SQLite probe](query-truncation-with-corpus.json) compares baseline `ff38e75`
with fix `554cd58` on the same synthetic corpus. Complete terms recover the expected
support source. An independent 46,905-character query with 4,000 distinct prefix terms
also recovers its tail subject. Balanced quoted OR expressions keep the FTS query tree
shallow; profile query-character and candidate limits still apply.

The initial two new regressions fail on the old implementation and pass after the fix:
tail-subject preservation and actual SQLite/engine retrieval through both excerpt and
rules-only output. All 40 existing applicability-corpus queries have unchanged meaningful
term lists. This is deterministic regression evidence, not fresh classification or
semantic-applicability acceptance. The long original prompt also retrieves unrelated
sources after the fix; broader lexical scope is not a semantic no-op solution.

Protocol `native-agent-v2` additionally moves the shared instructions to `AGENTS.md`
and adds expected-policy coverage scoring. The final native outcomes therefore are not
a controlled before/after comparison of the retrieval fix alone. The SQL probe preserves
the original prompt unchanged to isolate that specific defect.

Reproduce the deterministic probe after building the engine, choosing a new output file:

```sh
node packages/engine/evaluation/records/2026-10-24/native-agent-followup/query-truncation-probe.mjs /tmp/othie-query-truncation.json
```

The [initial restricted startup](restricted-pilot/protocol.json) records a protocol but
no sessions. The [final restricted startup](restricted-final/failure.json) records
`start_engine` / `EPERM`, also before any native session. The successful pilot and final
comparison run with the local IPC access required by the engine. Both restricted
attempts remain separate records.

## Verification and publication

The [CI run and job record](checks/ci-ff38e75.json) verifies pushed history through
`ff38e75`: clean installation, workspace typechecks and tests on macOS and Windows,
plus Windows startup-script syntax. It closes the older October 18/20/23 follow-up CI
gap. The new local benchmark and retrieval commits still need their own CI run.

The verification logs, native control and serial latency reports are retained alongside
these trajectories. Clean installation, build, final typechecks, website lint and
189 deterministic tests pass; one opt-in real-model test is skipped. Both dependency
audits report zero findings. The initial suite has 188 passing tests; final coverage
includes the added wrong-source diagnostic regression. [Hosted project controls](hosted-controls/summary.json)
pass 4/4. After generation and suite work, [strict adapter latency](strict-latency/summary.json)
passes 14/14 at actual 2,000/3,000 ms budgets (258–2,037 ms), and
[actual-default normal paths](default-latency/summary.json) pass 8/8 (260–275 ms).
These adapter timings exclude native generation and tools.

`publication.json` records publication hashes; `manifest.json`
lists every other file's bytes and SHA-256. The standalone verifier checks file coverage,
hashes, known private metadata/path redaction, trajectory/summary consistency and current
compiled-artifact hashes:

```sh
node packages/engine/evaluation/records/2026-10-24/native-agent-followup/verify-evidence.mjs
```

Realistic multi-file benchmarks, compiler semantics, local-model developer-message
consumption, interactive/persisted hook trust, native desktop/Windows sessions,
logon startup and signed installer/model distribution acceptance remain open.
