# Clause request evaluation

Recorded November 22, 2026 on macOS arm64 with Node.js 24.18.0. Commit
`a0c7930` freezes eight synthetic sources and 18 prompts. Commit `f65ce08` adds
an opt-in comparison after the eleven existing strategies. The same author
prepared the new prompts, their source judgments, and the candidate. Independent
review remains open.

`request-union` admits sources for each detected request separately and sends
their union to the shared packer. It recognizes local operations, literal
output, descriptive mentions, authority exclusions, deferred choices, and
selected call antecedents. `request-specific` adds one comparison within each
clause. It drops a source whose matched terms are a strict subset of another
source's matched terms. Equal overlaps can retain both sources. Both strategies
use the original sentences and the same 500-token cap.

| Corpus | Strategy | Positive recall | Positive exact | No-op |
| --- | --- | ---: | ---: | ---: |
| Historical | Reference focus | 98/98 | 94/98 | 82/82 |
| Historical | Request union | 96/98 | 92/98 | 82/82 |
| Historical | Request specific | 96/98 | 92/98 | 82/82 |
| Transfer | All three | 34/34 | 34/34 | 26/26 |
| Reference | Reference focus | 24/24 | 14/24 | 12/16 |
| Reference | Request union | 24/24 | 16/24 | 16/16 |
| Reference | Request specific | 22/24 | 20/24 | 16/16 |
| Matched contrasts | Reference focus | 20/20 | 2/20 | 2/16 |
| Matched contrasts | Request union | 20/20 | 0/20 | 14/16 |
| Matched contrasts | Request specific | 18/20 | 14/20 | 14/16 |
| Clause request controls | Reference focus | 26/26 | 4/26 | 0/10 |
| Clause request controls | Request union | 26/26 | 2/26 | 10/10 |
| Clause request controls | Request specific | 26/26 | 16/26 | 10/10 |

Scores include both repeats and agree between export modes. `request-specific`
passes six of nine matched pairs, up from one for `reference-focus`. It resolves
the selected and deferred call pair, keeps company evidence out of local-only
and negated lookups, and distinguishes a second request from a local mention.
Both new arms suppress evidence on valid and malformed local deduplication.
The new clause controls also show correct sources for the selected first call,
the switched call, and an independent prohibition after a deferred choice in
the specific arm.

Both arms lose `qualified-implicit-replacement`. The clause detector drops the
negated sorting instruction, then misses the link from “implement eligibility
and exceptions” back to `solve(refund)` without an explicit company qualifier.
The subset filter loses the current rinse standard when a query says “rinsing”
and the current standard says “rinse.” It also loses the vendor certificate
source when a single clause asks about both certificate release and the separate
calibration exception. The report index still competes with several policies,
including the coordinated archive and visitor request. The three failed matched
pairs for `request-specific` cover coordinated subjects, opposing standards, and
quoted references. All failures arise before packing in this run. Both candidates
fail overall acceptance and remain evaluation-only.

The [verifier](verify-evidence.mjs) checks all 1,408 candidate rows, repeat
parity, exact citations, full expected sentences, caps, and pre-packing/export
source parity. It also matches all 4,424 baseline, 1,264 assertion, and 1,264
reference rows on the preceding four corpora against their archived commitments,
excluding component time. Prior summaries match. The [run record](run.json)
preserves scores, paired gates, source changes and hashes. The
[verbatim rows](request-evidence.jsonl) cover the first repeat of both new arms
in both modes on the matched contrasts and clause request controls.

Full workspace build, typechecks, website lint, and 324 deterministic tests
pass with the existing installation. One opt-in real-model test is skipped.
The [compiled adapter check](checks/default-latency.json) passes 24/24 at the
2,000 ms default, with 259–280 ms parent wall time. The
[full audit](checks/audit-full.json) reports seven moderate development entries
and the [production audit](checks/audit-production.json) reports zero findings.
Registry tags still report parser 8.73.0 stable, 8.73.1-alpha.11 canary, and
minimatch 10.2.6 as the newest v10. The recorded parser compatibility decision
remains open. The [published desktop matrix](https://github.com/TilesOS/othie-ai/actions/runs/44975994626)
passes through `c2c2b0b`. CI for this evaluator and acceptance in native desktop
hosts remain open.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
for corpus in qualified-bindings scope-transfer scope-reference scope-contrast scope-request; do
  node packages/engine/dist/src/evaluation/query-scope.js --corpus "$corpus" \
    --candidate scope-request --out "$run_dir/$corpus" --repeats 2
done
node packages/engine/evaluation/records/2026-11-22/request-followup/verify-evidence.mjs "$run_dir"
```

The evaluator writes `completed: true` and exits 1 on the frozen baseline quality
failures. The candidate reports retain their own acceptance gates.
