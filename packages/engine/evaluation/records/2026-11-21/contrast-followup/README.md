# Matched policy scope evaluation

Recorded November 21, 2026 on macOS arm64 with Node.js 24.18.0. Commit
`11422b7` freezes eight synthetic sources and nine two-prompt contrasts before
`8e33680` adds the corpus to the evaluator. Each pair holds the surrounding
prompt fixed and varies one span. Eight pairs change the evidence requested.
The ninth compares a valid and malformed call in the same local task and
expects silence in both cases. The same author prepared the fixtures and
assessed scope. Independent review remains open.

## Results

| Existing strategy | Positive recall | Positive exact | No-op | Both prompts pass |
| --- | ---: | ---: | ---: | ---: |
| Lexical | 20/20 | 0/20 | 0/16 | 0/9 |
| Qualified bindings | 20/20 | 0/20 | 2/16 | 0/9 |
| Assertion-only | 20/20 | 0/20 | 2/16 | 0/9 |
| Assertion-subject | 20/20 | 0/20 | 2/16 | 0/9 |
| Reference-only | 20/20 | 0/20 | 2/16 | 0/9 |
| Reference-focus | 20/20 | 2/20 | 2/16 | 1/9 |

Row scores include both repeats and match between export modes. Pair scores
count each prompt pair once and require exact evidence or a no-op on both
sides. Across all eleven strategies, all 792 rows have exact citations and
pass the 500-token cap. Every strategy fails acceptance. All 3,920 baseline,
1,120 assertion, and 1,120 reference rows on the three preceding corpora match
their archived November 21 records except component time. Their summaries also
match, including all positive exact and no-op gates.

`reference-focus` passes only the replacement-intent pair. It carries
`specimen` into the shipment exception and drops it for the local comparator.
Six of the eight pairs that request different evidence return the same source
set on both sides. The selected and unresolved antecedents both return the
two shipment policies, with empty carried terms. The local fixture and
explicit negation controls still return company evidence. In the second-clause
pair, `also` disables explicit focus in both prompts, including the test-file
mention. In the literal display case, the strategy still recognizes `outage`
as an explicit policy focus. The shared archive/visitor and opposing rinse
contracts retrieve the required evidence but also admit the report layout.

The two call-syntax controls converge on `deduplicate specimen rows` and
return the same two unwanted sources. Removing malformed arguments repairs
the token stream and leaves the prose overlap. On all 72 `reference-focus`
rows, the pre-packing and exported source sets agree. The precision and no-op
failures in this corpus arise before packing. They support evaluating clause
intent and source applicability on matched pairs, including whether a later
statement requests policy, mentions it as data, or defers to a human choice.
The evidence does not establish applicability beyond these synthetic prompts.

## Verification

Full build, workspace typechecks, website lint and all 321 deterministic tests
pass locally. One opt-in real-model test is skipped. The engine process tests
and build use local socket and worker access. The workspace was tested with
the existing installation. The [compiled adapter run](checks/default-latency.json)
passes 24/24 at the actual 2,000 ms default, with 257–285 ms parent wall time.
This covers synthetic lexical delivery, silence, revocation, and engine
unavailability through both adapters. Native host and model acceptance remain
open.

The [full audit](checks/audit-full.json) reports seven moderate development
entries. The [production audit](checks/audit-production.json)
reports zero findings. The registry still lists minimatch 10.2.6 as the latest
v10 and TypeScript ESLint 8.73.0 with minimatch 11 as the latest stable parser.
An isolated `8.73.1-alpha.11` parser with minimatch 11.0.9 and TypeScript 6.0.3
passes 28/30 in the fixed project-service corpus. Both astral filename decisions
still reverse. The [installed parser](checks/parser-baseline.json) passes all
30 controls. The [canary record](checks/parser-canary.json) preserves the
per-case differences. The package migration still needs compatibility review.

[Main's latest published CI](https://github.com/TilesOS/othie-ai/actions/runs/44446520279)
passes both desktop jobs at `45ae572`. Exact-commit GitHub Actions queries for
`70b9d07` and `950dd43` return zero runs. Local verification covers the
November 21 evaluator changes through `8e33680`. The CI record still ends at
the preceding assertion and workflow changes.

```sh
npm run build --workspace=@othie/engine
run_dir=$(mktemp -d)
evaluator=packages/engine/dist/src/evaluation/query-scope.js
node "$evaluator" --corpus qualified-bindings --candidate scope-reference --out "$run_dir/historical" --repeats 2
node "$evaluator" --corpus scope-transfer --candidate scope-reference --out "$run_dir/transfer" --repeats 2
node "$evaluator" --corpus scope-reference --candidate scope-reference --out "$run_dir/reference" --repeats 2
node "$evaluator" --corpus scope-contrast --candidate scope-reference --out "$run_dir/contrast" --repeats 2
node packages/engine/evaluation/records/2026-11-21/contrast-followup/verify-evidence.mjs "$run_dir"
```

Each evaluator exits 1 on the recorded quality failures and writes a summary
with `completed: true`. The archive preserves first-repeat verbatim evidence
in both modes, commitments to both repeats and all summaries, and pair scores.
The verifier can check the archived evidence alone or compare it with the four
full reruns and the three preceding commitments.
