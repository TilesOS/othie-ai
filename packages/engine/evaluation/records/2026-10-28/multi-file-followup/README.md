# Native multi-file service comparison

Recorded October 28, 2026 in America/New_York (October 29 UTC) on macOS arm64,
Node.js 24.18.0 and Codex CLI 0.156.1. The requested hosted model is `gpt-6-astra`
with low reasoning effort; all six Othie receipts identify it. Fixtures and probes
are synthetic. Provider snapshots, caching, warm state and machine load are uncontrolled.

Implementation commits are `af81f3a` (isolated module grading) and `ed60d3e`
(multi-file corpus and recursive integrity). Commit `61b9ccb` records prior CI;
`1d61c40` records the reproducible no-op diagnostic. Production retrieval and hook
semantics are unchanged.

## Native comparison

The [protocol](final/protocol.json) preserves three miniature service repositories,
eight external documents, two repeats, rotating condition order, initial files,
public and hidden probes, per-case instructions and compiled artifacts. Each fresh
Git workspace has three editable CommonJS modules: domain logic, an ordered batch
service and a request endpoint. The validator, contract, package manifest, public
tests, README and AGENTS remain protected. Hidden probes exercise individual modules
and their composition, numeric boundaries, customer exceptions, validation, ordering
and input preservation. Public tests check the request envelope without policy values.

| Condition | All gates passed | Behavioral probes | Operational checks | Reported input tokens | Reported cached input tokens | Reported output tokens |
| --- | --- | --- | --- | --- | --- | --- |
| Task only | 2/6 | 45/64 | 6/6 | 376,087 | 308,224 | 4,650 |
| Full documents | 6/6 | 64/64 | 6/6 | 439,310 | 391,424 | 6,207 |
| Othie | 4/6 | 64/64 | 6/6 | 402,102 | 363,520 | 5,902 |

The [summary](final/summary.json) links all 18 completed trajectories, final module
sources, native command events, hook receipts, usage and separate scores. All sessions
complete, run successful public tests, and preserve protected files. Othie transports
the engine XML exactly in all six sessions and supplies every expected policy sentence
in all four policy-dependent tasks. Its two array-control sessions fail the required
no-op despite passing every behavioral probe. Consequently Othie passes 4/6 complete
gates, not 6/6. The CLI exits 1 because task-only behavior and Othie no-op gates fail;
the run is complete.

Task-only support implementations pass 6/12 probes in both repeats. Task-only refund
implementations pass 9/12 and 8/12; both miss the customer exception. Their array
controls pass 8/8. Full-document and Othie implementations each pass 12/12 support,
12/12 refund and 8/8 array probes in both repeats. These are repeated observations
of three small fixed services, not independent samples or general coding-quality
acceptance. Direct module probes prevent endpoint success from masking broken lower
layers; they do not prove architectural dependency use against a hostile agent.

Reported host tokens accumulate across native turns; cached input is a separate
reported count. Local supplied-evidence totals are 2,496 full-document tokens and
1,756 Othie tokens, excluding the hook wrapper and including the unwanted array
excerpts. These figures do not establish causal host token savings, billing savings
or a performance advantage. Native wall times include generation/tools. Model
extraction, embeddings and synthesis are disabled. Production-scale repositories,
dependency migrations, additional models and broader semantic acceptance remain open.

## Preserved request-identifier no-op failure

Both original array-control prompts include `Route solve(request)`. Lexical retrieval
matches that identifier to refund-policy wording and injects all four refund excerpts
(207 XML tokens). Exact receipt transport passes, but the required no-op and policy
coverage gates fail. Code correctness cannot override those failures. The fixed
native task remains unchanged.

The [same-engine diagnostic](noop-probe.json) records the original task, a query-only
intervention changing `solve(request)` to `solve(payload)`, and a refund-positive
control. The original has one shared term (`request`) with `refunds.md` and returns
four excerpts; the identifier intervention has no source overlaps and returns none;
the refund-positive control returns four excerpts. This isolates a lexical collision
in this fixture. Renaming a diagnostic query is not a production fix or semantic
no-op acceptance, and globally suppressing `request` was not evaluated for recall.

Reproduce after building, using a new output path and local engine socket access:

```sh
node packages/engine/evaluation/records/2026-10-28/multi-file-followup/noop-probe.mjs /tmp/othie-native-noop.json
```

## Verification and publication

The [CI run record](ci-5da7f3e.json) verifies the preceding native-agent and lexical
retrieval changes through full revision `5da7f3e113bc712c73403c160d14ae80fb61093f`.
Both macOS and Windows jobs pass clean installation, typechecks and tests; Windows
also passes startup-script syntax. The new module-grader and multi-file commits still
need remote CI. Automated runners do not establish native Windows sessions.

Clean installation, full build, final typechecks, website lint and 193 deterministic
tests pass; one opt-in real-model test is skipped. Both refreshed dependency audits
report zero findings. [Hosted project controls](hosted-controls/summary.json) pass
positive, no-op, live revocation and unavailable-engine checks (4/4).

After all native generation completes, serial [strict adapter latency](strict-latency/summary.json)
passes 14/14 conditions at the actual 2,000/3,000 ms budgets (261–2,037 ms complete
process times, including stall controls). Serial [actual-default paths](default-latency/summary.json)
pass 8/8 at 262–278 ms. These are synthetic lexical adapter measurements; they exclude
native host generation/tools and do not establish semantic filtering latency.

The [restricted startup](restricted/failure.json) records `start_engine` / `EPERM`
before native sessions. The restricted suite log preserves eight IPC failures;
the complete suite passes with local socket access. The restricted Next.js build
stalled, was terminated (143), and was rerun successfully. Restricted audit DNS errors
also remain alongside the successful network-enabled audits. These attempts are
separate from the final verification results.

`publication.json` records hashes before and after publication redaction and log
whitespace normalization;
`manifest.json` lists every other file's size and SHA-256. The verifier checks file
coverage, hashes, private metadata/path redaction, fixture identity, expected-policy
and no-op gates, native event scores, current compiled artifacts and prior CI steps.
It independently regrades every saved module snapshot against public and hidden probes:

```sh
node packages/engine/evaluation/records/2026-10-28/multi-file-followup/verify-evidence.mjs
```

The preserved no-op failure, compiler semantics, local-model developer-context
consumption, interactive/persisted trust, native desktop/Windows sessions, logon
startup, signed installers and model redistribution remain acceptance boundaries.
