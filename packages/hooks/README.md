# Othie prompt-hook runtime

Shared authenticated CLI transport and fail-open delivery for the Codex and Claude Code
adapters. This package has no indexing, database, provider, or credential-reading logic.
It passes the prompt through stdin and delegates authorization to the engine CLI.

The runtime checks the response's version, host/workspace metadata, safe citation labels,
packed-item shapes, status agreement, and measured token count before emitting context.
Only the existing verified rule/excerpt/synthesis sections are accepted. A malformed,
over-budget, late, or unavailable response produces no context. Empty results are silent.
The cap covers the engine's XML; host framing and the adapter's short introduction are
additional tokens, and the connected model's tokenizer may differ.

The entry point bounds stdin and subprocess output to one million bytes each. Its default
two-second deadline starts at Node's performance time origin, including module loading,
stdin reading, the CLI request, and response validation. An exhausted startup budget
skips the CLI. Synchronous startup/validation can delay cancellation; late context is
discarded, and the host's outer timeout bounds total process lifetime. Timed-out CLI children are killed.
Diagnostics contain fixed error codes only. The adapters neither read host transcripts nor
alter host settings. See the individual integration guides for setup and removal.

`--diagnostics-json` opts into a single content-free JSON event on stderr for injection,
empty results, or failure. It records host/surface/phase, elapsed time since Node startup, outcome,
and counts from validated responses. No prompt, text, path, profile, citation, credential,
or session identifier is included. Othie does not store these events or send them anywhere.
