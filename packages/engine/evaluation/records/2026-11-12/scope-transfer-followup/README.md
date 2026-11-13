# Scope transfer follow-up

Recorded November 12, 2026 on macOS with Node.js 24.18.0. This evaluation-only
follow-up tests seven unchanged query interventions against new synthetic
documents and tasks, then reruns the entire historical corpus. No production
retrieval, strategy, dependency or historical fixture changed.

## Design and boundaries

The eight documents and 30 tasks were frozen in `1619601` before the first
candidate run; evaluator support was committed separately in `6753196`. They
cover retention, uploads, guest credentials, notifications, opposing deployment
standards, writing and scheduling. Seventeen positives include generic subjects,
negative rules, mixed local/policy tasks, code subjects and qualifications.
Thirteen no-ops include literal, incidental, malformed, negated and local tasks.
The author knew the old failures and implementations: freezing before execution
prevents outcome-driven fixture edits in this run, but does not create independent
human review or a blinded statistical holdout. Treat these as transfer diagnostics.
The frozen source is checked against its Git blob by the evidence verifier.

Each of two repeats seeds fresh SQLite/Lance stores separately for excerpts and
rules-only export. Only the eight new documents enter the transfer stores;
historical runs retain the ten old documents and all 90 cases. Providers are
disabled. Rules-only uses manually supplied whole-document rules, isolating query
scope from model extraction/grouping. Case order reverses and strategy order
rotates on repeat two. Every expected sentence, exception and opposing source
must survive. Source precision counts each retrieved source once per positive
task; this does not measure passage relevance within an expected source.

## Transfer results

Counts below are per export mode, including both repeats. Both modes and repeat
judgments agree. The result set has 840 rows: 30 tasks × seven strategies × two
modes × two repeats. All citations and 500-token caps pass; every strategy fails
acceptance. Both CLI runs exit 1 after writing complete results, as intended when
scope gates fail.

| Strategy | Positive recall | Positive exact | No-op | Expected/retrieved positive sources |
| --- | ---: | ---: | ---: | ---: |
| lexical | 34/34 | 4/34 | 4/26 | 42/78 |
| drop-request | 34/34 | 4/34 | 4/26 | 42/78 |
| mask-call-arguments | 22/34 | 4/34 | 10/26 | 28/58 |
| policy-guarded-arguments | 28/34 | 4/34 | 10/26 | 36/68 |
| local-bindings | 28/34 | 4/34 | 14/26 | 36/68 |
| clause-bindings | 30/34 | 4/34 | 14/26 | 38/70 |
| qualified-bindings | 30/34 | 4/34 | 16/26 | 38/72 |

Qualified bindings lose the trailing `as required` upload subject and distant
upload antecedent on each repeat, while lexical retains all positives. They
include extra sources on 30/34 positive checks. Lexical includes extras on 30/34
as well. Better no-op scores do not compensate for the recall or exactness failures.

On the first repeat, qualified bindings retrieve `editorial.md` for the upload
code task and `calendar.md` for guest policy tasks. These documents explicitly
disclaim those topics; exact citations still fail source relevance. Notification
defaults also retrieve upload defaults. The failed no-ops include a local chart,
an incidental policy filename, a numeric replacement, a malformed call and the
local `through solve(guest)` task. The complete row-level evidence is preserved
in [transfer/results.json](transfer/results.json). No source was globally excluded,
and no strategy was tuned after observing these results.

## Historical compatibility and checks

[Historical results](historical/results.json) contain all 2,520 preceding rows.
The verifier compares every field except measured component time against the
November 11 record, and compares every summary field except its results filename.
All terms, evidence, text, citations, scores, gates, subsets and ordering remain
identical. Every prior compiled component hash except the extended evaluator
entry point remains identical. Qualified bindings still score 94/98 positive
recall, 40/98 positive exact, 68/82 no-ops and 114/192 positive source memberships
per mode. All seven historical strategies still fail acceptance.

The preceding precision verifier passed before rebuilding. Full workspace build,
typechecks, website lint and 308 deterministic tests pass; one opt-in real-model
test is skipped. Nineteen focused tests pass. Full build and process tests used
local process/IPC access. The generated website `next-env.d.ts` path change was
restored before typechecks and lint. [Check metadata](checks/checks.json) records
exits and scope; logs have repository/user/temp paths normalized. The manifest,
publication hashes and source/compiled hashes accompany the record.

```sh
node packages/engine/evaluation/records/2026-11-12/scope-transfer-followup/verify-evidence.mjs
npm run eval:query-scope -- --corpus scope-transfer --out /tmp/othie-transfer-new --repeats 2
```

The verifier independently recomputes sentence coverage, source precision,
recall, no-op and exactness gates; checks citations, XML token counts, row
uniqueness, order, repeat stability, fixture freezing and historical parity; and
verifies source/publication integrity. Independent recomputation is distinct from
independent authorship of expected labels.
An initial verifier attempt scanned its own JavaScript denylist and failed its
privacy check. The failed log is retained; limiting that content scan to JSON,
text and Markdown, as in the preceding verifier, passes. Result judgments did
not change.

No clean install, audit refresh, remote CI inspection, model/native-host session
or standalone adapter latency probe ran. Existing macOS CI cancellations, Windows
native-host, interactive trust, local-model consumption, semantic/latency,
dependency remediation and distribution acceptance gaps remain open.

Next investigate affirmative subject relevance versus meta-document disclaimers
and generic query scaffolding, preserving real negative policies and opposing
requirements. Keep this transfer record fixed; any strategy informed by these
outcomes needs a further separately authored corpus and independent review before
production adoption. A global subject/source exclusion cannot resolve the paired
generic-subject positives and negative-policy controls safely.
