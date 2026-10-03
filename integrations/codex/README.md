# Othie Codex prompt-hook prototype

This repository-contained prototype implements the current Codex `UserPromptSubmit`
command-hook contract. It reads the documented JSON event from stdin, uses only `prompt`
and `cwd`, asks the local Othie engine for `surface: "code"`, `phase: "turn_start"`
context under the `codex` bridge credential, and emits
`hookSpecificOutput.additionalContext` only when the verified brief contains a packed
rule, excerpt, or synthesis.

The adapter has a two-second default internal deadline and the example Codex handler has
a three-second outer timeout. Engine failures, deadline expiry, empty results, malformed
events, and invalid engine responses all exit successfully without adding model context.
Diagnostics are generic codes on stderr and never include the user prompt, source text,
returned context, credentials, or subprocess errors.

The adapter shares `@othie/hooks` with Claude Code. It independently recounts the engine's
XML with the declared tokenizer, checks the requested cap, verifies host/workspace
metadata, and rejects inconsistent status or citation data. The cap covers XML; the
adapter introduction and host framing add tokens. The internal deadline also covers
stdin reading after module initialization, and input/output are limited to one million
bytes. The host's outer timeout covers startup.

Pass `--diagnostics-json` or set `OTHIE_CODEX_DIAGNOSTICS_JSON=1` to emit one content-free
JSON event on stderr, including successful injection and empty/no-op outcomes. It records
only host/surface/phase, elapsed milliseconds, outcome, and validated token/item/conflict
counts. It excludes prompts, sources, citations, paths, profiles, credentials, sessions,
and subprocess errors, and is never stored or uploaded automatically.

## Build and test

From the repository root:

```sh
npm run build
npm run typecheck
npm test
```

The adapter tests use positive, empty, and invalid response fixtures and simulate
unavailable and timed-out engines. They do not modify Codex configuration.

## Local setup

Build the repository, create a bridge credential with only the intended profile grants,
and start the engine:

```sh
npm run engine -- credential create --config config.json --bridge codex --profiles company --default-profile company --out .othie/bridge-codex.credential
npm run engine -- engine foreground --config config.json
```

Merge [hooks.example.json](hooks.example.json) into the repository's
`.codex/hooks.json`, replace `/absolute/path/to/node`, and review/trust the hook with
Codex's `/hooks` command. The example resolves repository files from the Git root so it
also works when Codex starts in a subdirectory. It intentionally does not install itself
or modify `~/.codex`.

To remove the prototype, delete its `UserPromptSubmit` handler from `.codex/hooks.json`
(or delete that file if it contains nothing else). The MCP tools continue to work
independently of the hook.
Run `npm run engine -- credential revoke --config config.json --bridge codex` when
the host's grant is no longer needed. Delete the local credential file separately.

## Privacy and behavior boundary

Othie processing can remain local, but Codex may send injected developer context to its
cloud model. Only grant the adapter profiles whose packed exports may leave the local
engine. `cwd` is relevance/provenance metadata, not an authorization signal; profile
access still comes exclusively from the bridge credential.

This is a Codex-only prototype, not a public plugin. It uses the authenticated Othie CLI
and IPC path rather than opening storage or bypassing credential/profile checks. The
adapter does not replace Codex repository exploration and does not add navigation hints
or verification claims before the engine has safe producers for them.
