# Othie Claude Code prompt hook

Opt-in `UserPromptSubmit` adapter using the same bounded context contract as the Codex
prototype. It reads only the prompt and working directory from stdin, queries the local
engine through its authenticated CLI, and emits `hookSpecificOutput.additionalContext`
when the result contains verified packed items. It never emits a block decision.

The default internal deadline is two seconds after module initialization, including
stdin reading; the example gives the host a three-second outer timeout. Empty retrieval,
engine failure, timeout, and invalid or over-budget responses all allow the prompt to
continue without Othie context. Diagnostics use fixed codes on stderr.

## Setup

From the Othie repository root, build and create a separate credential for this host:

```sh
npm run build
npm run engine -- credential create --config config.json --bridge claude-code --profiles company --default-profile company --out .othie/bridge-claude-code.credential
npm run engine -- engine foreground --config config.json
```

Merge [settings.example.json](settings.example.json) into `.claude/settings.local.json`,
replace the Node executable placeholder with an absolute Node.js 24 executable, and
restart Claude Code. The example assumes this checkout is the Claude Code project root.
For another project, replace the `${CLAUDE_PROJECT_DIR}` prefixes with absolute paths to
this Othie checkout. Use the exec-form `command` plus `args` so paths with spaces and shell
characters remain single arguments on macOS and Windows. `/hooks` displays configured
hooks. No settings are installed automatically by this package.

The configuration follows the official [hook reference](https://code.claude.com/docs/en/hooks)
checked October 2, 2026, including exec-form command arguments. Older hosts may require an
upgrade to support that form. The automated tests verify the adapter contract; a live
Claude Code session and Windows native-host run remain separate acceptance checks.

Remove only this handler from `hooks.UserPromptSubmit` to disable delivery, retaining any
other handlers. MCP tool access continues independently.

## Controls and privacy

Both CLI arguments and host-specific environment variables are supported:

| Argument | Environment variable | Default |
| --- | --- | --- |
| `--max-tokens` | `OTHIE_CLAUDE_CODE_MAX_TOKENS` | 500 |
| `--deadline-ms` | `OTHIE_CLAUDE_CODE_DEADLINE_MS` | 2000 |
| `--diagnostics-json` | `OTHIE_CLAUDE_CODE_DIAGNOSTICS_JSON=1` | off |

Config, bridge ID, and credential-file overrides also accept `OTHIE_CONFIG`,
`OTHIE_BRIDGE_ID`, and `OTHIE_BRIDGE_CREDENTIAL_FILE`. Pass absolute paths in host settings.
The budget counts Othie's XML; the short introduction and host framing add tokens, and
Claude's tokenizer can differ from the configured engine tokenizer.

Grant only profiles whose context may be sent to Claude's model provider. The adapter does
not read transcripts, sessions, host tools, or unrelated third-party data. Working directory
metadata never widens the credential's profile grants. Model training is unnecessary for
keyword retrieval and this adapter.

Optional JSON diagnostics emit one allowlisted event per call on stderr: host, surface,
phase, elapsed milliseconds, outcome, and validated token/item/conflict counts. They
exclude prompt/source text, citations, paths, profile names, session IDs, credentials,
and subprocess errors. Nothing is persisted or uploaded by Othie; a local collector can
capture stderr deliberately. Disable the flag/environment variable to restore the default.
