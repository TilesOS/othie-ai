# Policy trigger evaluation

Recorded November 27, 2026 on macOS with Node.js 24.18.0. Commit
`25eab40` freezes 16 synthetic documents and 22 prompts. The first seven
prompts preserve the November 26 admission probes and their expected sources.
Commit `204d1f9` adds the evaluation-only `request-trigger` arm. The same
author prepared the fixtures, implementation, and later probes.

The arm recognizes additional active conjuncts with explicit objects and
passive conjuncts with supported participles. It considers literal and
equivalent action verbs together, then checks the governing conditions.
It records whether each candidate's trigger matched, conflicted with the
request, or remained unconfirmed. Matching retains the original policy
wording and qualifiers in both export modes.

| New corpus checks | Request-predicate | Request-trigger |
| --- | ---: | ---: |
| Complete positive recall | 18/30 | 30/30 |
| Exact positive evidence | 18/30 | 30/30 |
| No-ops | 8/14 | 14/14 |

The counts include both repeats and agree between export modes. The trigger
arm passes all nine matched pairs and 1,084/1,096 exact-evidence gates. It
loses three historical positives in both modes and repeats:

- `request-disclaimer-boundary` asks for the dispatch log before maintenance.
  The source specifies logging before calling maintenance.
- `action-conditional-requirement` asks what to do during a pressure alarm.
  The source requires filter replacement when the alarm repeats.
- `action-transposed-object` asks about cleaning after replacing intake
  filters. The source uses “after replacement” after identifying the filters
  in an earlier sentence.

The replay reproduces 7,056 baseline rows, 2,016 rows each for the assertion,
reference and clause-request arms, and 1,008 rows each for the subject, position,
action and predicate arms across the nine preceding corpora. Archive digests
exclude component times. Pre-packing and exported source membership agree on
all trigger rows. Citation and token gates pass throughout.

The trigger arm passes two of eight [later admission probes](checks/admission-probes.json),
compared with one of eight for the predicate arm. It selects an equivalent
action when the literal verb occurs under a different trigger, and rejects an
incompatible time for a lone source. Remaining failures involve a passive
series, an irregular passive verb, an unlisted active verb with a bare object,
and an unrecognized event paraphrase. In two further cases, a dangling
conjunction masks a shared trigger, and the request's two triggers are applied
to a single action binding. The regressions leave production adoption open.
Independent judgments and native latency remain pending.

The [verifier](verify-evidence.mjs) checks archived report digests, recomputes
scores and traces, checks verbatim citations and token counts, and reproduces
the probes. The [run record](run.json) retains scores, hashes, and outcomes.
[Verbatim evidence](trigger-evidence.jsonl) includes one row per export mode
for each new prompt and each changed historical prompt.

Local build, workspace typechecks, website lint, and 339 deterministic tests
pass. One opt-in real-model test is skipped. The [compiled adapter run](checks/default-latency.json)
passes all 24 conditions at the 2,000 ms default, with 261–285 ms parent wall
time on synthetic lexical retrieval.

The [published predicate evaluator matrix](https://github.com/TilesOS/othie-ai/actions/runs/45930497728)
passes clean installation, typechecks, website lint, and tests on macOS 15
and Windows. Windows startup-script syntax passes. The [job record](checks/ci-c04bb42.json)
identifies exact revision `c04bb42`. The trigger evaluator awaits published CI.

The [full audit](checks/audit-full.json) reports seven moderate development
entries and the [production audit](checks/audit-production.json) reports zero
findings. The [registry refresh](checks/parser-registry.json) finds the same
stable and canary parsers, minimatch 11.0.9, and the existing 10.2.6 as the
newest 10.x release. The November 26 run reproduces both astral filename
reversals on those canary and minimatch versions.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
for corpus in qualified-bindings scope-transfer scope-reference scope-contrast scope-request scope-subject scope-position scope-action scope-predicate scope-trigger; do
  node packages/engine/dist/src/evaluation/query-scope.js --corpus "$corpus" \
    --candidate scope-trigger --out "$run_dir/$corpus" --repeats 2
done
node packages/engine/evaluation/records/2026-11-27/trigger-followup/verify-evidence.mjs "$run_dir"
```

The evaluator writes `completed: true` and exits 1 when a frozen baseline
fails a quality gate. The trigger report carries the candidate gates.
