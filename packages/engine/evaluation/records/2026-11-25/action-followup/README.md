# Policy action evaluation

Recorded November 25, 2026 on macOS arm64 with Node.js 24.18.0. Commit
`4cc6641` freezes eight synthetic documents and 18 prompts before commit
`8e4df23` adds the `request-action` evaluation arm. The same author prepared
the fixtures, implementation, and follow-up probes. Independent review remains open.

The arm parses selected requests into action and object pairs. It checks each
pair against one governing phrase, with inflection handling for passive and
nominal forms. For a definite short object such as “the filters,” it can use an
earlier assertion of the same action in that source. Explicit position still
constrains the match. Recognized comparison prompts retain the earlier position
selection. Admitted sources supply their original evidence to the shared
500-token packer.

| Corpus | Request-position recall / exact / no-op | Request-action recall / exact / no-op |
| --- | --- | --- |
| Historical | 98/98 · 98/98 · 82/82 | 98/98 · 98/98 · 82/82 |
| Transfer | 34/34 · 34/34 · 26/26 | 34/34 · 34/34 · 26/26 |
| Reference | 24/24 · 24/24 · 16/16 | 24/24 · 24/24 · 16/16 |
| Matched contrasts | 20/20 · 20/20 · 16/16 | 20/20 · 20/20 · 16/16 |
| Clause request controls | 26/26 · 24/26 · 10/10 | 26/26 · 26/26 · 10/10 |
| Subject controls | 28/28 · 28/28 · 8/8 | 28/28 · 28/28 · 8/8 |
| Position controls | 32/34 · 32/34 · 2/2 | 34/34 · 34/34 · 2/2 |
| Action controls | 28/28 · 16/28 · 2/8 | 28/28 · 28/28 · 8/8 |

Counts include both repeats and agree between export modes. The candidate
passes all 920 frozen rows and all nine matched pairs. The humidity and lens
prompt recovers the lens-cleaning source through `cleaning` and `cleaned`.
The dispatch-log prompt drops the forklift source through an object match on
`vehicle faults` in the governing assertion. This prompt uses the object fallback
for “requirement for reporting” because the policy uses `log`. The action trace
records that fallback separately from direct action matches.

Five [follow-up probes](checks/admission-probes.json) checked source admission
after the frozen run. The candidate passes two. It loses a rule when the request
selects the second governing verb in one sentence, and it loses the `record award
nominations` rule when the request uses `document`. Both were recovered by the
position arm. Both arms also retrieve two gate-closing rules when the request
specifies one trigger. These probes expose recall regressions and a condition
precision gap. Keep the arm in evaluation and preserve these probes for the
next comparison.

The [verifier](verify-evidence.mjs) reproduces the admission traces and checks
repeat stability, complete expected evidence, verbatim citations, token caps,
and agreement between pre-packing and exported sources. A replay at published
commit `45b678c` first passed the November 24 verifier. The November 25 replay
matches all 5,936 baseline rows, 1,696 rows each for the assertion, reference,
and clause-request arms, and 848 rows each for the subject and position arms
on the seven preceding corpora except for component time. The [run record](run.json)
retains hashes and scores. [Verbatim rows](action-evidence.jsonl) preserve the
new corpus and earlier changes once per export mode.

Full workspace build, typechecks, website lint, and 333 deterministic tests
pass. One opt-in real-model test is skipped. The [compiled adapter check](checks/default-latency.json)
passes 24/24 at the 2,000 ms default with 281–298 ms parent wall time. The
[published `45b678c` matrix](https://github.com/TilesOS/othie-ai/actions/runs/45553871436)
passes install, typecheck, website lint, and tests on macOS 15 and Windows.
Windows startup-script syntax passes. This [job record](checks/ci-45b678c.json)
covers the published policy position work. The action evaluator still needs
published CI.

The [full audit](checks/audit-full.json) reports seven moderate development
entries. The [production audit](checks/audit-production.json) reports zero
findings. The newer [parser canary 8.74.1-alpha.2](checks/parser-canary.json)
uses minimatch 11.0.9 and passes 28/30 file-admission controls. Its 30 outcomes
match the preceding canary, including the two astral filename reversals.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
for corpus in qualified-bindings scope-transfer scope-reference scope-contrast scope-request scope-subject scope-position scope-action; do
  node packages/engine/dist/src/evaluation/query-scope.js --corpus "$corpus" \
    --candidate scope-action --out "$run_dir/$corpus" --repeats 2
done
node packages/engine/evaluation/records/2026-11-25/action-followup/verify-evidence.mjs "$run_dir"
```

The evaluator writes `completed: true` and exits 1 when a frozen baseline
fails its quality gates. The candidate report carries its own gates.
