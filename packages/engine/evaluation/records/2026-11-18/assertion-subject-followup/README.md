# Assertion and subject scope evaluation

Recorded November 18, 2026 on macOS arm64 with Node.js 24.18.0. Commits
`75e2451` and `cbe6a95` add two evaluation-only comparisons to the frozen
historical and transfer corpora. The earlier term-ablation verifier passed
before rebuilding.

## Measurement

`--candidate assertion-subject` runs both comparisons after the seven baseline
strategies in each fresh SQLite/Lance store. Assertion-only admits a source if a
qualified-binding term overlaps a sentence outside the recognized document
scope disclaimers. Assertion-subject uses the same admission rule and also
adjusts qualified-binding terms for explicit policy wrappers, call connectors,
subject-specific defaults, and immediate trailing company qualifications.
Bare requests for company defaults still retain `defaults`. Neither comparison
uses the expected sources for term rewriting or source admission.

The evaluator filters retrieved sources before the shared packer. Admitted
sources retain their original sentences, including scope disclaimers,
prohibitions and exceptions. The records capture asserted and disclaimed
overlaps as well as the source set before packing. The source unit here is one
whole fixture document. These narrow patterns leave real ambiguity about what
an assertion covers and whether a task asks for it.

Two fresh repeats per export mode reverse case order and rotate strategy order.
The [historical](historical/) and [transfer](transfer/) records together hold
960 candidate rows. All 3,360 baseline rows match the November 14 record after
excluding component time. Every baseline score, subset and gate also matches.
The [parity commitments](baseline-parity.json) cover those rows and summaries.
Both repeats agree on evidence and judgments for every candidate row, and every
candidate row passes exact citations and the 500-token cap. Component times
describe the measurement only. Production retrieval is outside the experiment.

| Corpus / strategy | Positive recall | Positive exact | No-op | Relevant/retrieved positive sources |
| --- | ---: | ---: | ---: | ---: |
| Historical qualified bindings | 94/98 | 40/98 | 68/82 | 114/192 |
| Historical assertion-only | 94/98 | 60/98 | 72/82 | 114/158 |
| Historical assertion-subject | 96/98 | 88/98 | 78/82 | 118/130 |
| Transfer qualified bindings | 30/34 | 4/34 | 16/26 | 38/72 |
| Transfer assertion-only | 30/34 | 20/34 | 18/26 | 38/50 |
| Transfer assertion-subject | 32/34 | 28/34 | 20/26 | 40/44 |

Scores are per export mode and include two repeats. Both modes have the same
scores. Both candidates preserve every passing qualified-binding judgment
within these fixtures. The combined candidate recovers the same-clause
trailing qualification in both corpora. It keeps the generic defaults, negative
credential rule and both sides of the opposing export/deployment controls.
The distant refund and upload antecedents still fail. A historical local CSV
plot still retrieves policy, and the transfer incidental, replacement, and
malformed-call controls still retrieve unwanted policies. Residual extra sources
include export policies on refund tasks and archive retention on a deployment
task through shared vocabulary. The older `regional-defaults` query loses
`defaults` in its term trace. This run measures only term parity on those 40
older applicability queries.

**Both candidates fail acceptance.** These recorded corpora informed the
heuristics. Further review needs separately authored cases and independent
judgment. Keep the original records fixed while addressing antecedent binding
and remaining multi-subject collisions.

## Local, dependency, and CI checks

A clean `npm ci --no-audit`, all workspace builds and typechecks, website lint,
and 318 deterministic tests passed, with one opt-in real-model test skipped.
The Next.js static build exported the expected routes. The generated website
reference was restored before typecheck and lint. Twenty-four focused tests
passed before the clean install. The candidate runs completed before and after
the clean install, with expected CLI exit 1 from the baseline quality gates.
Local build and process tests used local process and IPC access.

The preliminary audit found eight moderate entries in total, including one
production package entry for two Next.js cache disclosure advisories.
Commit `27ceab6` updates Next.js and its ESLint config from 16.4.3 to 16.4.6.
The follow-up audit reports seven moderate development entries from the parser's
minimatch dependency chain and zero production findings.
[Next.js root params advisory](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) ·
[Next.js nested cache advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8)

The registry now lists TypeScript ESLint 8.73.0 with a minimatch 11 dependency.
A temporary latest-parser install with the lint toolchain's TypeScript 6.0.3
peer and minimatch 11.0.9 passes 28/30 existing parser controls. Both astral
filename decisions still reverse. The initial temporary install requested
TypeScript 7.0.2 and npm rejected the parser's peer range. The isolated
rerun used the same peer version as the installed parser. The repository
retains the existing TypeScript ESLint version pending compatible behavior or
explicit review of the filename semantics.
[Upstream release](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0) ·
[Parser probe](checks/upstream-parser.json)

The last pushed revision, `4db79b5`, passes Windows installation, typecheck,
lint, tests and startup script syntax. macOS was cancelled before setup.
The job annotation identifies an unsupported `macos-14` runner configuration,
and GitHub retired the image on November 2. Commit `889ba8c` pins the supported
`macos-15` arm64 runner. The workflow YAML, matrix and Windows syntax step were
checked locally. Remote execution of the replacement matrix remains open.
[Prior GitHub Actions run](https://github.com/TilesOS/othie-ai/actions/runs/43680097308) ·
[Runner annotation](checks/macos-annotations.json) ·
[GitHub runner retirement](https://github.blog/changelog/2026-10-01-github-actions-macos-14-runner-image-retirement/)

Native host and model acceptance, independent scope review, and adapter
latency remain open. The candidate evidence can be verified after building the
engine. Supply the directory containing fresh historical and transfer output
directories to also compare all rerun baseline fields and candidate results.

```sh
npm run build --workspace=@othie/engine
mkdir -p /tmp/othie-assertion
node packages/engine/evaluation/records/2026-11-18/assertion-subject-followup/verify-evidence.mjs
node packages/engine/dist/src/evaluation/query-scope.js --corpus qualified-bindings --candidate assertion-subject --out /tmp/othie-assertion/historical --repeats 2
node packages/engine/dist/src/evaluation/query-scope.js --corpus scope-transfer --candidate assertion-subject --out /tmp/othie-assertion/transfer --repeats 2
node packages/engine/evaluation/records/2026-11-18/assertion-subject-followup/verify-evidence.mjs /tmp/othie-assertion
```
