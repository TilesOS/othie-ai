# Othie host compatibility

MCP tool access and turn-start delivery have different behavior. A configured MCP host
decides when to retrieve context. The opt-in prompt hooks run at turn start and fail open
when Othie is empty, unavailable, late, or returns an invalid response.

| Host | Delivery | Setup location | Automated coverage | Native-host acceptance |
| --- | --- | --- | --- | --- |
| Codex | `UserPromptSubmit` command hook | Project `.codex/hooks.json` | Fixtures, compiled-process behavior, and live-engine credential/revocation/restart tests | macOS CLI: four conditions pass with invocation-local hooks and trusted project hooks from root/nested launches; interactive hook trust/UI and local-model consumption remain open |
| Claude Code | `UserPromptSubmit` command hook | Project `.claude/settings.local.json` | Same shared contract, setup checks, and live-engine credential/revocation/restart tests | macOS CLI: explicit/project/local settings pass at root; local and explicit settings pass from nested directories; shared root settings are not discovered from nested launches; interactive trust/UI remains open |
| Claude Desktop | MCP stdio bridge | Host MCP configuration printed by `host-config --host claude` | Engine/bridge SDK process tests and configuration tests | Not recorded |
| Cursor | MCP stdio bridge | Host MCP configuration printed by `host-config --host cursor` | Configuration tests and shared bridge tests | Not recorded |
| VS Code | MCP stdio bridge | Host MCP configuration printed by `host-config --host vscode` | Compiled configuration tests and shared bridge tests | Not recorded |

Use a distinct least-privilege credential per host. Hook adapters use the authenticated
CLI and never open engine storage directly. The same OS user is the isolation boundary;
working directory and host metadata do not authorize profiles. No integration is installed
automatically, and removing its handler restores the host's original prompt behavior.

The cap applies to the engine's XML under its configured tokenizer. Adapter introductions,
host framing, and tokenizer differences add overhead. Local processing does not prevent
the connected host from sending returned context to its model provider.

See [Codex setup](codex/README.md), [Claude Code setup](claude-code/README.md), and the
[engine MCP guide](../packages/engine/README.md). The shared runtime also supports opt-in
content-free JSON diagnostics on stderr. Hosted ChatGPT prompt hooks, post-discovery
refreshes, and generated navigation hints remain planned.

`npm run test:mcp` builds both adapters and runs the shared live-engine acceptance test
alongside the MCP and lifecycle suites. It requires local socket/named-pipe access and
uses synthetic documents with unavailable model providers. The test compares both hosts'
exact injected context, checks irrelevant-task no-ops, excludes another profile's sources
even when the event's working directory points at them, revokes deleted evidence, starts
the engine again with changed evidence, and rejects invalid credentials. It runs compiled
hook processes; it does not launch the native Codex or Claude Code applications.

Native macOS acceptance is recorded in the [October 3 evidence](../packages/engine/evaluation/records/2026-10-03/README.md).
These noninteractive sessions prove the tested configuration paths and model responses,
not desktop UI or persisted hook trust. The [October 18 Claude settings evidence](../packages/engine/evaluation/records/2026-10-18/native-settings-followup/README.md)
adds project/local discovery and nested-launch checks, including the shared-root settings
discovery failure. Start Claude at the root when using shared root settings, or pass an
explicit settings path. The [October 20 Codex records](../packages/engine/evaluation/records/2026-10-20/codex-project-followup/README.md)
verify trusted project-hook discovery from root and nested launches. They retain the
original project-trust setup failure and the local-model positive-context failure;
interactive persisted hook trust remains open. The [October 23 transport records](../packages/engine/evaluation/records/2026-10-23/local-context-followup/README.md)
show the complete positive context reaching Ollama in a developer message, followed by
an `unknown` answer. Evaluation-only system/user role comparisons pass, narrowing the
failure to developer-message handling in the installed provider/model combination;
local-model consumption remains unaccepted. Final hosted project hooks pass 4/4 with
strict content-free diagnostic validation. Windows native-host acceptance is unrecorded.
