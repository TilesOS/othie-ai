# Othie host compatibility

MCP tool access and turn-start delivery have different behavior. A configured MCP host
decides when to retrieve context. The opt-in prompt hooks run at turn start and fail open
when Othie is empty, unavailable, late, or returns an invalid response.

| Host | Delivery | Setup location | Automated coverage | Native-host acceptance |
| --- | --- | --- | --- | --- |
| Codex | `UserPromptSubmit` command hook | Project `.codex/hooks.json` | Relevant/empty/invalid/timeout fixtures and compiled-process behavior | Not recorded |
| Claude Code | `UserPromptSubmit` command hook | Project `.claude/settings.local.json` | Same shared contract and host-specific fixture/setup checks | Not recorded |
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
