# Policy vocabulary guard follow-up

Recorded November 1, 2026 in America/New_York (November 2 UTC), on macOS arm64
with Node.js 24.18.0. All fixtures are synthetic. Implementation commit `40d5622`
adds the opt-in corpus and candidate. Production retrieval remains unchanged.

## Hypothesis and protocol

The October 29 comparison lost code-expressed subjects under unconditional
argument masking. This candidate retains all lexical terms when the query
contains `policy`, `policies`, `requirement`, `requirements` or `company defaults`;
otherwise it masks simple argument identifiers using the preceding intervention.
This is an explicit vocabulary guard, not a semantic intent classifier.

The [protocol](final/protocol.json) retains the original 27 cases and ten documents,
and adds 18 counterexamples: nine positives and nine no-ops. These include implicit
policy requests, multiline and mixed tasks, opposing export requirements,
incidental/quoted/negated cues, literals and nested calls. The extension is selected
with `--corpus policy-guard`; the default corpus and three strategies remain intact.
Protocol `query-scope-shadow-v2` records the corpus, original IDs, strategy list,
fixtures and compiled hashes. No policy labels are passed to the candidate.

Two fresh SQLite/Lance repeats per export mode reverse case order and rotate
strategy order. Excerpts use reference chunks; rules-only uses manually supplied
whole-document authoritative rules. Providers are disabled. This isolates query
scope from extraction, classification and rule grouping. Every original sentence
from each expected source must survive, including exceptions, negations and both
opposing policies. Positive extra sources are reported separately; no-ops require
empty evidence. These controlled repeats are not independent statistical samples.

## Results

The [summary](final/summary.json) has identical scores in both export modes:

| Strategy | Full positive recall | Full no-ops | Original positives | Original no-ops | Added positives | Added no-ops |
| --- | --- | --- | --- | --- | --- | --- |
| Lexical | 48/48 | 4/42 | 30/30 | 4/24 | 18/18 | 0/18 |
| Drop `request` | 46/48 | 24/42 | 28/30 | 12/24 | 18/18 | 12/18 |
| Mask call arguments | 32/48 | 20/42 | 22/30 | 8/24 | 10/18 | 12/18 |
| Policy-guarded arguments | 44/48 | 12/42 | 30/30 | 8/24 | 14/18 | 4/18 |

The guarded candidate appears recall-safe on the original corpus, but loses both
implicit refund cases on every repeat. `Implement solve(refund) with the correct
eligibility and exceptions` and `According to company documents, implement
solve(refund)` lose their only refund subject. In contrast, the telemetry case
retains `consent` outside its signature and still retrieves complete telemetry
evidence. Term removal by itself does not establish a retrieval failure.

Incidental ordering policy, repository formatting policy, quoted policy text and
negated policy requests trigger the guard without establishing external relevance.
The original prose collisions also remain. The unchanged native array query
receives no evidence in either guarded shadow repeat; native sessions were not
rerun. Neither that improvement nor original recall
can compensate for missing policies and the broader unwanted-context failures.
The candidate fails acceptance and remains evaluation-only.

All [720 raw results](final/results.json) retain queries, terms, expected/actual/
missing/additional sources, missing original sentences, exact quotations, XML and
component timings. All citation and 500-token gates pass, and judgments/evidence
are stable across both fresh repeats. The 324 rows shared with the October 29
comparison retain identical queries, terms, evidence, XML and judgments. All 40
prior applicability queries retain their terms for every strategy, which does
not measure semantic filtering or extraction.

## Validation and evidence

Clean installation, full build, workspace typechecks, website lint and 200
deterministic tests pass; one opt-in real-model test is skipped. The production
audit reports zero advisories. The full audit exits 1 with 16 moderate affected
dependency entries from one newly reported minimatch advisory. Logs and exit results
are retained in [checks](checks/checks.json). The first focused test incorrectly
assumed telemetry evidence would disappear after removing its argument term;
the [failed assertion record](checks/initial-focused-test.json) explains the
correction. Fixtures and candidate were unchanged. All seven final focused tests
pass. The scope CLI exits 1 for completed failed acceptance gates.

The [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
marks versions below 11.0.1 affected. The lockfile contains minimatch 10.2.6 and
legacy 3.1.5 in the ESLint toolchain. Registry metadata shows no newer v3 release;
installed import/React rules call the v3 module directly as a function, whereas
the [v11 documentation](https://github.com/isaacs/minimatch/blob/v11.0.1/README.md)
uses a named `minimatch` export and describes a matcher rewrite without backports.
An unconditional v11 override would change that consumer API. The audit also
offers incompatible ESLint/Next-config downgrades. No forced downgrade, override,
audit suppression or lockfile change was applied. This development dependency
acceptance gap remains open; neither production exposure nor exploitation through
this project's lint inputs was established. The [analysis](checks/audit-analysis.json)
retains consumer snippets/hashes, sources and the boundary of this inspection.

The [CI record](ci-298dbe9.json), inspected November 1, verifies full revision
`298dbe963dec75c63750745e639351a341fbbe97` on macOS and Windows: clean installation,
workspace typechecks/tests and Windows startup-script syntax. The new local
candidate commits still need CI. Automated runner checks do not establish native
Windows host or logon-startup acceptance.

Publication hashes record log redaction and normalization; the manifest covers
every retained file except itself. The verifier independently recomputes all
scores and subsets, validates original/counterexample identities, checks both
repeat/order integrity and evidence/token gates, pairs all 324 preceding results,
and checks the current compiled artifacts and prior CI steps:

```sh
node packages/engine/evaluation/records/2026-11-01/policy-guard-followup/verify-evidence.mjs
```

Reproduce after building, into a new directory:

```sh
npm run eval:query-scope -- --corpus policy-guard --out /tmp/othie-policy-guard-new --repeats 2
```

No native/model sessions or adapter latency probes were rerun because only the
offline evaluator changed. Component timings exclude startup, ingestion, IPC and
native generation, and establish no hook latency or token-saving result. A next
candidate must preserve implicit policy requests without requiring these guard
words, distinguish quoted/negated/incidental cues, and handle mixed tasks without
losing subjects. Broader semantic scope and end-to-end latency, local-model
developer-context consumption, interactive trust, native desktop/Windows sessions,
production-scale repositories, additional models, signing and model redistribution
remain separate acceptance work.
