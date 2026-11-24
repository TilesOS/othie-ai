# Request subject evaluation

Recorded November 23, 2026 on macOS arm64 with Node.js 24.18.0. Commit
`7c4af2e` freezes eight synthetic documents and 18 prompts. Commit `8976e5e`
adds `request-subject` as an opt-in evaluation arm alongside the existing
strategies. The same author prepared the new source judgments and the candidate.
Independent review remains open.

The candidate carries one eligible call argument into a bounded implicit
replacement and defers a replacement with multiple unselected arguments. It
compares coordinated subjects separately and uses consecutive term overlap in
asserted sentences, with lexical overlap as a fallback. An explicit comparison
of both standards can retain a source with one fewer consecutive term. A
descriptive index sentence can be excluded from admission while a requirement
in the same document remains available. The evaluator packs complete original
evidence under the existing 500-token cap.

| Corpus | Request-specific recall / exact / no-op | Request-subject recall / exact / no-op |
| --- | --- | --- |
| Historical | 96/98 · 92/98 · 82/82 | 98/98 · 98/98 · 82/82 |
| Transfer | 34/34 · 34/34 · 26/26 | 34/34 · 34/34 · 26/26 |
| Reference | 22/24 · 20/24 · 16/16 | 24/24 · 22/24 · 16/16 |
| Matched contrasts | 18/20 · 14/20 · 14/16 | 20/20 · 18/20 · 16/16 |
| Clause request controls | 26/26 · 16/26 · 10/10 | 26/26 · 22/26 · 10/10 |
| Subject controls | 26/28 · 16/28 · 4/8 | 28/28 · 24/28 · 6/8 |

Scores include both repeats and agree between export modes. The candidate
recovers the implicit refund replacement, the certificate release source in
the compound request, and the current rinse standard. It passes eight of nine
matched pairs, up from six. The remaining positive outage pair retrieves a
specimen shipment exception whose condition mentions an outage.

The candidate adds the loading-bay standard to two cold-room prohibition
requests that `request-specific` handled correctly. It also returns both film
standards when the request names the current standard or asks for the
prohibition. A descriptive-only index request retrieves an incidental pump
rule even after excluding the index sentence itself. The index prompt's
expected no-op assumes the task requires applicable policy evidence. Its
wording should be included in the independent fixture review. The reference
corpus retains an extra calibration source for the disposal-disclaimer case.
Every candidate output source set equals its pre-packing set. Subject
alignment improves recall but the extra-source and no-op failures reject
overall acceptance. Production retrieval continues to use its existing path.

The [verifier](verify-evidence.mjs) checks all 776 candidate rows, repeat
parity, exact citations, complete expected sentences, caps, and pre-packing
source parity. It also compares the earlier five corpora with the verified
November 22 run. All 4,928 baseline rows and 1,408 rows each for the assertion,
reference, and request strategies match except component time. Prior summaries
match. The [run record](run.json) contains the report hashes, scores, and source
changes. The [verbatim rows](subject-evidence.jsonl) cover the first repeat in
both modes on the matched and subject corpora.

Full workspace build, typechecks, website lint, and 327 deterministic tests
pass. One opt-in real-model test is skipped. The
[compiled adapter check](checks/default-latency.json) passes 24/24 at the
2,000 ms default, with 261–283 ms parent wall time. The published
[desktop run for `d591b15`](https://github.com/TilesOS/othie-ai/actions/runs/45232814879/attempts/2)
passes clean installation, typechecks, website lint, and tests on macOS 15
and Windows, plus Windows startup-script syntax. GitHub reported a hosted
runner capacity failure for the initial macOS job. The targeted retry passed.
The [job record](checks/ci-d591b15.json) preserves both outcomes.

The [full audit](checks/audit-full.json) reports seven moderate development
entries and the [production audit](checks/audit-production.json) reports zero
findings. An isolated copy of the website parser fixtures and harness gives
30/30 with the [installed parser](checks/parser-baseline.json).
[TypeScript ESLint 8.74.0](checks/parser-stable.json) and its
[8.74.1-alpha.0 canary](checks/parser-canary.json) each use minimatch 11.0.9
and pass 28/30. Both still reverse the `?.ts` and `??.ts` decisions for the
astral filename. The development dependency pin remains pending compatible
file admission or review of the behavior change.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
for corpus in qualified-bindings scope-transfer scope-reference scope-contrast scope-request scope-subject; do
  node packages/engine/dist/src/evaluation/query-scope.js --corpus "$corpus" \
    --candidate scope-subject --out "$run_dir/$corpus" --repeats 2
done
node packages/engine/evaluation/records/2026-11-23/subject-followup/verify-evidence.mjs "$run_dir"
```

The evaluator writes `completed: true` and exits 1 when a frozen baseline
fails its quality gates. The candidate reports carry their own gates.
