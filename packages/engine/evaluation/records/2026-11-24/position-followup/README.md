# Policy position evaluation

Recorded November 24, 2026 on macOS arm64 with Node.js 24.18.0. Commit
`0c69a80` freezes eight synthetic documents and 18 prompts before commit
`af1df88` adds the `request-position` evaluation arm. The same author prepared
the fixtures and the candidate. Independent review remains open.

The candidate applies the earlier clause and subject matching to each request.
It looks for named standards and explicit obligations, prohibitions, or
permissions within the same assertion as the topic. It discounts matches
found only in recognized conditional phrases when a primary assertion matches.
It also skips requests for descriptive directory entries. Named comparisons
can select multiple standards. Original evidence from each admitted source
goes through the shared 500-token packer.

| Corpus | Request-subject recall / exact / no-op | Request-position recall / exact / no-op |
| --- | --- | --- |
| Historical | 98/98 · 98/98 · 82/82 | 98/98 · 98/98 · 82/82 |
| Transfer | 34/34 · 34/34 · 26/26 | 34/34 · 34/34 · 26/26 |
| Reference | 24/24 · 22/24 · 16/16 | 24/24 · 24/24 · 16/16 |
| Matched contrasts | 20/20 · 18/20 · 16/16 | 20/20 · 20/20 · 16/16 |
| Clause request controls | 26/26 · 22/26 · 10/10 | 26/26 · 24/26 · 10/10 |
| Subject controls | 28/28 · 24/28 · 6/8 | 28/28 · 28/28 · 8/8 |
| Position controls | 32/34 · 10/34 · 0/2 | 32/34 · 32/34 · 2/2 |

Scores include both repeats and agree between export modes. The candidate
passes all nine matched pairs, up from eight. It resolves the cold-room
prohibitions, selects a single film standard, and retains both standards when
the prompt compares them. It removes the incidental pump source from the
index-entry request and the specimen exception from the outage logging task.
It preserves all prior positive recall judgments.

The candidate adds the forklift inspection source to the dispatch-log
requirement. The obligation filter accepts shared terms such as `fault` and
`before` alongside the obligation, even though the source governs inspection.
The new compound humidity logging and lens-cleaning request loses the required
lens-cleaning source after the condition-only match is removed. The second half
still selects the lens-case tagging rule because of `camera lens` overlap. The
same query previously recovered lens-cleaning through the humidity alarm phrase.
These failures reject overall acceptance. Production retrieval continues to use
its existing path. The next evaluation needs a request's object and action to
support the same assertion before position or condition can settle admission.

The [verifier](verify-evidence.mjs) checks 848 candidate rows for original
citations, complete expected evidence, token caps, repeat stability, and source
parity before and after packing. It also verifies 5,432 baseline rows, 1,552 rows
each for the assertion, reference, and clause-request arms, and 776 subject rows
across the preceding six corpora. All match the November 23 replay except
component time. The [run record](run.json) retains scores and hashes. The
[verbatim rows](position-evidence.jsonl) include the new prompts and prior
prompts with an exact-source failure in either arm, once per export mode.

Full workspace build, typechecks, website lint, and 330 deterministic tests
pass. One opt-in real-model test is skipped. The [compiled adapter check](checks/default-latency.json)
passes 24/24 with 257–287 ms parent wall time at the 2,000 ms default.
The [published `4d492d8` matrix](https://github.com/TilesOS/othie-ai/actions/runs/45329579475)
passes installation, typechecks, website lint, and tests on macOS 15 and
Windows, and the Windows startup script syntax step passes. The [job record](checks/ci-4d492d8.json)
covers that published revision. This evaluation remains local.

The [full audit](checks/audit-full.json) reports seven moderate development
entries, and the [production audit](checks/audit-production.json) reports zero
findings. The parser stable and canary tags remain `8.74.0` and `8.74.1-alpha.0`,
both declaring `^11.0.1` for minimatch. The latest minimatch 10 release is
still 10.2.6, and the current 11 release is 11.0.9. The November 23 file-admission
comparison remains the compatibility evidence for those versions.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
for corpus in qualified-bindings scope-transfer scope-reference scope-contrast scope-request scope-subject scope-position; do
  node packages/engine/dist/src/evaluation/query-scope.js --corpus "$corpus" \
    --candidate scope-position --out "$run_dir/$corpus" --repeats 2
done
node packages/engine/evaluation/records/2026-11-24/position-followup/verify-evidence.mjs "$run_dir"
```

The evaluator writes `completed: true` and exits 1 when a frozen baseline
fails its quality gates. The candidate report carries its own gates.
