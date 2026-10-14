# Complete adapter-process latency follow-up

Recorded October 13, 2026 in America/New_York (artifact timestamps use UTC), on
Linux x64 with Node.js 24.19.0. All documents, prompts and credentials are temporary
synthetic fixtures. No model, native host session or model download is used.

The [fresh-engine summary](fresh-engine/summary.json) records evaluator commit
`97cbdcb`, with three fresh engines, indexes and credential stores. Both compiled
adapters are exercised in each fixed condition; host order alternates by repeat.
The parent measures from before spawn through process close. Normal cases must
finish within 2,000 ms; stall controls must exit before the 3,000 ms host watchdog.
The adapter's own 2,000 ms budget starts after module initialization.

| Condition | Passing attempts | Complete process time, ms |
| --- | ---: | ---: |
| Positive cited first-response policy | 6/6 | 800–1,074 |
| Repository-only no-op | 6/6 | 821–1,380 |
| Authenticated stalled engine | 6/6 | 2,276–2,513 |
| Delayed stdin, then stalled engine | 6/6 | 2,275–2,668 |
| Stdin never closes | 6/6 | 2,270–2,753 |
| Live credential revocation | 6/6 | 795–1,434 |
| Unavailable engine | 6/6 | 779–1,549 |

All 42 attempts meet both behavior and process-budget gates. Positive output
retains the source citation and the qualification that the first-response target
is not a resolution deadline. Both engine-stall cases reach the authenticated
engine; all stall cases emit no context. Timeout diagnostics report internal
elapsed times of 2,001–2,006 ms. The additional process time cannot be assigned
entirely to startup: it also includes scheduling, output and shutdown.

The [initial test output](initial-regression.txt) preserves a preceding failed
regression run: one Claude Code engine-stall invocation hit the outer watchdog
at about 3,012 ms; the other 13 attempts passed. The test removed its temporary
attempt files, so no raw diagnostic for that failed invocation survives. Its
cause is not isolated. The subsequent [initial standalone run](initial-standalone/summary.json)
passes 14/14 at the same default budgets; it used the pre-commit evaluator before
the shared-runtime hash and additional normal-path engine-receipt gates were added.
The failure is not erased by these later observations.

The runtime fix uses one absolute monotonic deadline for stdin, event parsing,
transport, validation and output serialization. Expired budgets cannot start a
query, and late synchronous failures report timeout even if the timer callback
has not fired. Three deterministic regressions fail against the prior runtime
and pass with the fix. Model-only deadlines remain separate from this adapter
budget.

The live evaluator regression uses 5,000 ms internally and an 8,000 ms outer
watchdog to verify behavior and evidence under parallel test load. It does not
establish default-budget acceptance; the standalone records above retain the
strict defaults. The regression also checks complete attempt preservation,
credential/path privacy, malformed diagnostics, engine receipt, source
qualifications and refusal to overwrite evidence.

The [manifest](manifest.json) hashes the preserved attempts, protocols, summaries
and initial failed test output. Temporary engine state and credentials are removed
after each repeat. Extraction, embeddings and synthesis are disabled, so this
measures lexical excerpt fallback rather than semantic applicability. It does
not establish native host discovery/trust, desktop UI, macOS/Windows, production
load, compiler recall, or model-filter latency acceptance. Fixed local repeats
are not independent samples or a general latency guarantee.
