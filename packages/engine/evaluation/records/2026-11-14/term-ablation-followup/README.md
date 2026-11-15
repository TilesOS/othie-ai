# Scope term ablation follow-up

This follow-up began November 14, 2026 with Node.js 24.18.0 on macOS. It
investigates query scaffolding and source disclaimers without changing a query
strategy, fixture, dependency or production retrieval. The preceding transfer
verifier passed before rebuilding. Commits `5941b7d` and `a78568a` add the trace,
opt-in evaluator integration and six deterministic controls.

## Measurement

`--diagnostics term-ablation` requires the `qualified-bindings` or `scope-transfer`
corpus. All seven existing strategies still run with their original gates and
CLI acceptance. After every baseline row in a fresh store has completed, the
diagnostic probes the qualified-binding query terms. It records each exact
whole-word overlap by original source sentence, then runs every document-matching
term alone and with only that term removed. Probe generation uses query terms and
document text, never expected source labels. Unmatched terms remain in the
leave-one-out query, including the 4,000-term prefix. Empty queries still exercise
the compiler through `?`.

The probes run through the same engine, SQLite/Lance retrieval, rule selection,
compiler, citation mapping and 500-token cap. Documents remain intact: no
disclaimer, negative rule, exception or opposing source is removed or relabeled.
Sentence traces describe overlap, not assertion classification or applicability.
Source presence also depends on ranking and packing. Cache reuse means component
times are not comparable latency measurements.

Two fresh repeats per corpus and export mode reverse case order and rotate
strategy order. The [transfer](transfer/) and [historical](historical/) records
contain 840 and 2,520 baseline rows respectively. Every baseline row except
component time and every summary score/subset/gate match the preceding frozen
record exactly. All preceding compiled component hashes except the extended
evaluator entry point are unchanged.

The new `term-diagnostics.json` files contain 480 case records and 1,296
retrieval probes: 376 transfer and 920 historical. Evidence and judgments are
stable across repeats; every probe passes exact citations and the token cap.
All seven baseline strategies still fail acceptance. No new applicability
strategy or joint term-removal intervention was evaluated.

## Findings

[findings.json](findings.json) reports single-term unwanted-source memberships
and every uniform single-term removal counterfactual. Its tables use only the
first repeat per mode, so repeated measurements do not inflate task counts.
Both export modes have the same scores below.

| Corpus / query intervention | Positive recall | Positive exact | No-op |
| --- | --- | --- | --- |
| Historical qualified baseline | 47/49 | 20/49 | 34/41 |
| Historical remove `use` | 47/49 | 24/49 | 34/41 |
| Historical remove `through` | 47/49 | 20/49 | 37/41 |
| Historical remove `customer` | 47/49 | 28/49 | 34/41 |
| Historical remove `telemetry` | 45/49 | 21/49 | 34/41 |
| Transfer qualified baseline | 15/17 | 2/17 | 8/13 |
| Transfer remove `use` | 15/17 | 3/17 | 8/13 |
| Transfer remove `through` | 15/17 | 2/17 | 9/13 |
| Transfer remove `defaults` | 14/17 | 2/17 | 8/13 |
| Transfer remove `upload` | 13/17 | 3/17 | 8/13 |
| Transfer remove `guest` | 13/17 | 4/17 | 10/13 |

`upload` alone retrieves both `upload.md` and the editorial disclaimer saying
the writing reference does not define upload limits. `guest` alone retrieves
both the guest policy and the scheduling disclaimer about guest credentials.
`use` alone retrieves the writing reference; `through` alone retrieves the
calendar reference. These fixed-store probes identify distinct overlap paths
that coexist in a task; removing one term need not remove the unwanted source.
The trace retains complete sentences for inspection rather than declaring every
negative sentence a disclaimer.

Removing `defaults` makes the notification task exact but loses the genuinely
generic request for all company defaults. Removing `upload` loses the required
code-subject and active-quoted upload tasks even as another positive becomes
exact. Removing `guest` improves selected positives and local no-ops while losing
two required guest tasks. Historical `telemetry` removal similarly loses two
positives. These are measured recall/precision tradeoffs, not safe stopwords.
`use`, `through` and `customer` improve some known cases without an observed
recall loss in this corpus, but leave many failures and have no independent
scope validation. They have not been added to production stopwords.

The single-term `deploy` probes retain both current permission and legacy
prohibition. Single-term `guest` probes retain the complete credential prohibition
and expiration evidence. Whole-document sentences, exceptions and opposing rules
remain required by the scorer, including in interventions that lose recall.

## Verification and next work

Full workspace build, typechecks, website lint and 314 deterministic tests pass;
one opt-in real-model test is skipped. Twenty focused diagnostic/scope/metric
tests pass. Full build and process tests use local process/IPC access. The
generated website `next-env.d.ts` reference was restored before typechecks and
lint. Logs are normalized at capture for repository/user/temp paths.

```sh
node packages/engine/evaluation/records/2026-11-14/term-ablation-followup/verify-evidence.mjs
node packages/engine/dist/src/evaluation/query-scope.js --corpus scope-transfer --diagnostics term-ablation --out /tmp/othie-term-new --repeats 2
```

The verifier recomputes sentence matches, probe plans, complete evidence
judgments, source changes, scores and repeat stability. It checks baseline row
and summary parity against hashed prior records, compiled/source hashes, file
publication integrity and the derived findings. Independent recomputation is
distinct from independent authorship or semantic judgment.

No clean installation, audit refresh, remote CI inspection, native/model session
or standalone adapter latency probe ran. Existing CI, dependency, native trust,
Windows-session, local-model consumption and distribution gaps remain open.

Next develop a separate evaluation-only assertion/subject candidate using the
sentence traces, distinguishing meta-document scope disclaimers from genuine
prohibitions while preserving affirmative document subjects and real generic
requests. Test query scaffolding in context, preserve both frozen corpora and
all historical gates, and keep antecedent failures visible. A strategy informed
by these records needs further separately authored cases and independent review
before production adoption.
