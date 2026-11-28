# Policy event evaluation

Recorded November 27, 2026 on macOS with Node.js 24.18.0. Commit `22cedc6`
freezes 18 synthetic documents and 26 prompts, including the eight admission
probes from the trigger follow-up. Commit `34cb2e5` adds the evaluation-only
`request-event` arm. The same author prepared the fixtures, candidate and
later probes.

The candidate assigns conditions to individual requested and asserted actions.
It recognizes comma-separated passive predicates and selected irregular
participles. A nominal condition such as “after replacement” can use the
earlier assertion in the same source that identifies what was replaced. The
trace retains both sentences verbatim. Event comparison also recognizes
selected paraphrases and can return a more specific source condition such as a
repeated alarm when asked about the same alarm.

| New corpus checks per export mode, two repeats | Request-trigger | Request-event |
| --- | ---: | ---: |
| Complete positive recall | 14/34 | 34/34 |
| Exact positive evidence | 14/34 | 34/34 |
| No-ops | 18/18 | 18/18 |

Across eleven corpora, the event arm passes 1,200/1,200 exact-evidence gates,
including all nine matched pairs and all eight frozen trigger probes. It
recovers the three historical positives previously lost on event shorthand,
an alarm recurrence, and a nominal event with an earlier antecedent. The ten
prior corpora reproduce their report digests after component wall times are
removed. Pre-packing and exported source membership agree on every candidate
row. Citation and token checks pass in both export modes.

The event arm passes 5/10 [later admission probes](checks/admission-probes.json),
up from 3/10 for the trigger arm. It handles separate conditions in a passive
series and resolves a nominal event to the nearest eligible earlier assertion.
It misses an unfamiliar verb with a bare object in a coordinated request, a
passive conjunct with its own subject, alternative requested conditions joined
by “or,” and a nominal event introduced in a descriptive sentence. It also
regresses on an explicit “before calling maintenance” request by admitting the
separate policy for “before maintenance” alongside the requested policy. These
results leave transfer, independent judgment and native latency acceptance open.

The [run record](run.json) retains scores, hashes and probe outcomes. The
[verbatim evidence](event-evidence.jsonl) contains both export modes for each
new prompt and changed historical prompt. The [verifier](verify-evidence.mjs)
checks archived report digests, recomputes the outcomes and validates verbatim
citations, antecedents and token counts.

Workspace build, typechecks, website lint and 342 deterministic tests pass.
One opt-in real-model test was skipped. The [compiled adapter run](checks/default-latency.json)
passes 24/24 at the 2,000 ms default with 262–282 ms parent wall time on
synthetic lexical retrieval. The latest [published CI matrix](https://github.com/TilesOS/othie-ai/actions/runs/45930497728)
covers `c04bb42`. The trigger and event commits await published CI.

Package manifests and the lockfile match `c04bb42`. The registry check still
finds TypeScript ESLint parser 8.74.0 stable, 8.74.1-alpha.7 canary, minimatch
11.0.9 latest, and 10.2.6 as the latest 10.x. The
[previous audit and parser records](../trigger-followup/README.md) remain the
latest audit and compatibility evidence. Automatic approval review rejected
both fresh audits because the registry request would transmit the dependency
tree.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
for corpus in qualified-bindings scope-transfer scope-reference scope-contrast scope-request scope-subject scope-position scope-action scope-predicate scope-trigger scope-event; do
  node packages/engine/dist/src/evaluation/query-scope.js --corpus "$corpus" \
    --candidate scope-event --out "$run_dir/$corpus" --repeats 2
done
node packages/engine/evaluation/records/2026-11-27/event-followup/verify-evidence.mjs "$run_dir"
```

The CLI writes `completed: true` and exits 1 when a frozen baseline fails a
quality gate. The event report carries the candidate gates.
