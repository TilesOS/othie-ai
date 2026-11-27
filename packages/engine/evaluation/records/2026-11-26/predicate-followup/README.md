# Policy predicate evaluation

Recorded November 26, 2026 on macOS with Node.js 24.18.0. Commit
`eeccee2` freezes 12 synthetic documents and 22 prompts. The first five
prompts preserve the November 25 admission probes and their expected sources.
Commit `2fbf711` adds the evaluation-only `request-predicate` arm. The same
author prepared the fixtures, implementation, and follow-up probes.

The arm splits known coordinated verbs within one assertion and can attach a
shared object to each. It tries a bounded verb alias when direct action and
object binding fails. For a recognized explicit trigger, it matches the
connector and phrase in a bound assertion. It uses that match to distinguish
competing rules and records when the trigger cannot be confirmed for a lone
candidate. The shared packer exports original evidence.

| New corpus checks | Request-action | Request-predicate |
| --- | ---: | ---: |
| Complete positive recall | 18/34 | 34/34 |
| Exact positive evidence | 10/34 | 34/34 |
| No-ops | 8/10 | 10/10 |

The counts include both repeats and agree between export modes. All 1,008
candidate rows across nine corpora pass the recall, exact evidence, no-op,
citation, and token gates. All nine matched pairs pass. The replay reproduces
6,440 baseline rows, 1,840 rows each for the assertion, reference, and clause
request arms, and 920 rows each for the subject, position, and action arms
across the eight preceding corpora. Component times are excluded from parity
hashes. Pre-packing and exported source membership agree on every candidate row.

Both arms pass two of seven [later admission probes](checks/admission-probes.json).
The new arm misses an unlisted coordinated verb and a second passive verb. Its
single-source fallback admits a rule with an incompatible trigger. A paraphrased
trigger suppresses the affected source when rules compete. A literal verb match
under the wrong trigger also blocks an alias with the required trigger. These
cases leave production adoption open. Independent judgments and native latency
remain pending.

The [verifier](verify-evidence.mjs) recomputes scores and traces, checks verbatim
citations and token counts, validates the prior archive digests, and reproduces
the probes. The [run record](run.json) retains scores, hashes, and probe outcomes.
[Verbatim evidence](predicate-evidence.jsonl) includes one row per new prompt and
export mode.

Full build, workspace typechecks, website lint, and all 336 deterministic
tests pass. One opt-in real-model test is skipped. The [compiled adapter run](checks/default-latency.json)
passes all 24 conditions at the default 2,000 ms, with 266–290 ms parent wall
time on synthetic lexical retrieval. The [published action evaluator matrix](https://github.com/TilesOS/othie-ai/actions/runs/45655702095/attempts/2)
passes clean installation, typechecks, website lint, and tests on macOS 15
and Windows, including Windows startup-script syntax. The
[initial attempt](checks/ci-1e414d6-attempt1.json) cancelled macOS before any
steps ran. The [targeted retry](checks/ci-1e414d6-attempt2.json) completed the
matrix for `1e414d6`. The predicate evaluator awaits published CI.

The [full audit](checks/audit-full.json) reports seven moderate development
entries and the [production audit](checks/audit-production.json) reports zero
findings. The isolated [8.74.1-alpha.7 parser canary](checks/parser-canary.json)
with minimatch 11.0.9 passes 28/30 file-admission controls and reproduces both
astral filename reversals from the preceding canary.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
for corpus in qualified-bindings scope-transfer scope-reference scope-contrast scope-request scope-subject scope-position scope-action scope-predicate; do
  node packages/engine/dist/src/evaluation/query-scope.js --corpus "$corpus" \
    --candidate scope-predicate --out "$run_dir/$corpus" --repeats 2
done
node packages/engine/evaluation/records/2026-11-26/predicate-followup/verify-evidence.mjs "$run_dir"
```

The evaluator writes `completed: true` and exits 1 when a frozen baseline
fails a quality gate. The predicate report carries the candidate gates.
