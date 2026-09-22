# MVP stabilization verification

The automated desktop suite runs without downloading models. `npm test` builds the
production JavaScript and tests the source modules plus compiled stdio bridge/CLI.
`npm run test:mcp` builds and runs just the MCP and engine-process integration tests.
The root workspace commands also build, typecheck, and test the repository-contained
Codex prompt-hook prototype.

## Recorded local result

2026-09-09, macOS: `npm test` built the production JavaScript and passed all 26
implemented tests across six test files. The real-model suite remains an explicit TODO.
The compiled `host-config --host vscode` command also produced the expected editor
configuration. No Windows runner, desktop-host UI session, or logon startup test was run
in this local verification.

## Workspace reorganization verification

2026-09-10, macOS: root `npm run build`, `npm run typecheck`, and `npm test`
passed after moving the engine to `packages/engine`. The suite passed 27 implemented
tests across seven test files; the real-model test remains a TODO. The added compiled-CLI
check creates a config outside the workspace, verifies bundled sample source paths and
config-relative state, refuses to overwrite the config, and checks the generated bridge path.
The root CLI also generated VS Code configuration pointing to the new compiled bridge.
All 52 relocated tracked files were accounted for; only the CLI initialization code changed.
Windows and native desktop-host acceptance were not rerun locally.

## Context-delivery vertical-slice verification

2026-09-11, macOS: root `npm run typecheck`, `npm test`, and `npm run test:mcp`
passed after adding request metadata, structured context output, and the Codex hook
prototype. The full deterministic test run passed 49 implemented tests: 28 engine,
14 website, and 7 Codex-adapter tests; the existing real-model test remains a TODO.
The dedicated MCP/process suite passed all five tests. Engine and Codex-adapter builds
passed, and a separate Next.js Webpack production build passed for the website.

The exact root `npm run build` did not complete in this restricted runner because the
unchanged Next.js Turbopack build was denied permission to bind its internal helper port.
This is recorded as an environment limitation, not a passing root-build result. No manual
Codex host session, Windows run, or native desktop-host acceptance was performed.

## Model context smoke evaluation

2026-09-22, macOS: root `npm run build`, `npm run typecheck`, `npm test`, and
`npm run test:mcp` passed after adding a synthetic model comparison and a
lexical no-op regression. The full deterministic run passed 54 tests (33 engine,
14 website, and 7 Codex-adapter tests); the existing real-model test remains a TODO.
The dedicated MCP/process suite passed five tests. The synthetic offline regression
retrieved cited support-policy evidence and returned an empty result for a
repository-only coding prompt. Full process tests required Unix-socket access outside
the restricted command sandbox.

Three repeated local Ollama runs scored baseline 1/4, full documents 3/4, and Othie
context 4/4 on four synthetic tasks with a 200-token Othie cap. The repository-only
control returned empty context in every run. The protocol, case results, input-token
counts, and limitations are recorded in the
[smoke evaluation report](context-delivery-smoke-evaluation-2026-09-22.md).
A synthetic `gpt-5.6-terra` extraction request reached the OpenAI API, but returned
HTTP 429 with `credit_balance_exhausted`, so there is no hosted score. No private
indexed documents were sent. A funded hosted run and a real tool-using agent benchmark
remain open. No manual Codex hook acceptance was performed in this pass.

## Coverage

- Actual LanceDB keyword and vector searches filter both profile and active IDs before
  top-k selection. Manifest lookup enforces the profile again, including a deliberately
  incorrect backend result. Synthesis input and returned text cannot include another
  profile's fixtures.
- A → B → A and delete/recreate publish fresh generations. Re-enqueued source jobs do
  not become a second concurrent worker for the same file.
- Text indexing, embeddings, and extraction have separate durable job states. Transient
  failures retry with backoff (up to 30 seconds) and survive an engine restart. Status
  reports pending/processing/done counts by operation. An embedding failure leaves
  SQLite keyword retrieval available. Model calls use deterministic fixtures here.
- Source-backed rules can be selected through semantic hits without query-word overlap.
  Different compatible rules do not automatically generate conflicts. Detection currently
  recognizes only explicit opposing modalities for the same action and scope; zero
  detected conflicts does not prove that a corpus is logically consistent.
- Whole rules and complete excerpt units retain qualifications, escape XML, and fit
  200/500-token limits. Count includes framing/citations. Empty output is explicit when
  no whole unit fits. Disabling the profile cap still permits a caller to request a cap.
- Legacy context requests still return the XML text block. Optional surface/phase/host/
  workspace metadata is bounded at the MCP boundary and echoed only as provenance in a
  versioned structured brief. Structured rules, excerpts, synthesis, safe citation labels,
  conflicts, status, and revision counters come from the same final packed selection.
- Codex hook fixtures cover relevant, empty, invalid, unavailable, and timed-out results.
  The positive fixture emits cited `additionalContext`; the other cases fail open, and
  diagnostic assertions exclude prompt and returned-context canaries.
- Two actual SDK clients use the compiled bridge with watching enabled. File creation,
  editing, renaming, and deletion are observed through MCP without manually enqueuing
  ingestion jobs. The bridge reconnects after engine restart.
- A second compiled engine process exits before opening storage; failed binds release
  locks/workers; a terminated engine's dead-owner lock can be recovered.

## Platform release gates

| Target | Evidence required |
| --- | --- |
| macOS | Local automated suite including real sockets, watchers, and subprocess startup. |
| Windows x64 | Green `Desktop verification` CI job on `windows-latest`; native named-pipe/watcher/process tests run there. |
| Windows background task | Install and start the task under an ordinary interactive user, log out/in, confirm one writer. CI currently checks PowerShell syntax, not logon behavior. |
| macOS background agent | Install the LaunchAgent with absolute paths; log out/in and confirm one writer. |
| Claude Desktop, Cursor, VS Code | Complete the manual host check below and record app version, OS, date, and result. SDK tests are not a substitute for this check. |

The Windows workflow is supplied in this change; a local macOS run does not establish
its result. Native app acceptance and real-model quality/latency remain separate gates.

## Host configuration and acceptance

Generate the correct JSON shape without changing any existing host settings:

```sh
node packages/engine/dist/src/cli.js host-config --host claude --config config.json --bridge claude --credential-file .othie/bridge-claude.credential
node packages/engine/dist/src/cli.js host-config --host cursor --config config.json --bridge cursor --credential-file .othie/bridge-cursor.credential
node packages/engine/dist/src/cli.js host-config --host vscode --config config.json --bridge vscode --credential-file .othie/bridge-vscode.credential
```

Create each credential with `credential create` first. Merge the generated configuration
into the host's configuration; it references a credential file and never embeds the secret.
Claude/Cursor use `mcpServers`. VS Code's editor configuration uses `servers` with
`type: "stdio"`; use its **MCP: Open User Configuration** command or a workspace
`.vscode/mcp.json`. Configure the editor being tested rather than assuming the separate
Copilot CLI/Agent Host reads the same file.

Start the Othie engine, enable/trust the server in the host, and confirm both tools appear.
Use a temporary profile containing `Othie smoke: support replies within four hours.`
Explicitly ask the host to call `get_organization_context` for `Othie smoke` with a
200-token limit. Inspect the tool result for the source and limit. Change four to six,
query again, then delete the file and confirm its content disappears. Restart the engine
and call `get_context_status` from the same host session. Use synthetic documents for
this check: a cloud-backed host may send returned context to its provider.

Citation labels such as `s1/policy.md` identify the first configured source root and its
relative path. Rule IDs (`r1`, `r2`) are local to one response. Synthesis includes its own
source locations even if the corresponding full rule/excerpt does not fit the budget.

Primary host references checked for this pass:

- [Claude Desktop local MCP setup](https://github.com/modelcontextprotocol/docs/blob/main/quickstart/user.mdx)
- [Cursor MCP configuration](https://prod.cursor.com/docs/mcp)
- [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [Codex lifecycle hooks](https://learn.chatgpt.com/docs/hooks)

## Codex prompt-hook acceptance

The prototype setup and removal procedure is documented in
[`integrations/codex/README.md`](../integrations/codex/README.md). Installing the MCP
server does not install this hook. A user must deliberately add and trust the project-local
hook configuration. The internal deadline is two seconds by default, the example Codex
handler timeout is three seconds, and either timeout leaves prompt submission unblocked.

Automated fixtures establish the adapter contract but are not a manual Codex host check.
When manually accepting the hook, record the Codex version, OS, date, positive prompt,
empty prompt, observed deadline behavior, and removal result. Use synthetic source text:
Codex may send the injected context to its cloud model even when Othie retrieval and
compilation run locally.

## Upgrade notes

Existing SQLite databases migrate in place to schema version 2. Old document histories
are retained, and source/configuration changes trigger rebuilding. Derived work is
scheduled for active documents lacking the new job records. There is no remote fallback
introduced by this migration.

The engine now locks `<data_dir>/engine.lock` before opening SQLite. Its IPC name is
scoped to the user/data directory and uses an OS temporary socket path on macOS or a
named pipe on Windows. Restart existing engines and bridges together after upgrading.
A crash during the very small lock-acquisition critical section may leave an
`engine.lock.claim` directory; startup fails closed. Remove that directory only after
confirming no engine is starting. An ordinary crash after startup is recovered automatically.
