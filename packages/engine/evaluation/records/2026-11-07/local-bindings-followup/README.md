# Local binding scope follow-up

Recorded November 7, 2026 in America/New_York, on macOS arm64 with Node.js
24.18.0. Implementation commit `002a8b0` adds an opt-in shadow strategy and
12 diagnostic cases. Production retrieval and repository dependencies are unchanged.

## Hypothesis and protocol

The prior vocabulary guard lost two implicit refund requests. The new
`local-bindings` candidate preserves implicit subjects by removing arguments only
in sentences with local operation cues (`sort`, `deduplicate`, `numeric`, or
`validates and wraps`). In those sentences it also removes explicitly named
variables. Narrow CSS layout and literal-rendering phrases remove local names
or quoted literals. Active quoted subjects outside those phrases remain visible.
This is a shallow heuristic, not an intent classifier or language parser; no
expected source names, policy documents or case labels enter its function.

The [protocol](final/protocol.json) retains all 27 original cases and 18
policy-guard counterexamples. Twelve new cases pair mixed same/split-sentence
requests, policy requests containing local-operation words, negated sorting,
active quoted subjects, and local function/quoted-variable collisions. These
cases were authored alongside the hypothesis and are not held-out validation.
The default and policy-guard corpus options retain their previous strategies.
Select this extension with `--corpus local-bindings`.

Two fresh seeded SQLite/Lance repeats per export mode reverse case order and
rotate strategy order. Providers are disabled. Excerpts use reference chunks;
rules-only uses manually seeded whole-document authoritative rules, isolating
scope from extraction/grouping. Every expected original sentence must survive,
including exceptions and opposing requirements. Extra positive sources are
reported separately; no-ops require completely empty evidence. Timings measure
components only and exclude startup, ingestion, IPC and native generation.

## Results

The [summary](final/summary.json) has identical scores in both export modes.
Counts include two controlled repeats, not independent statistical samples:

| Strategy | Full positives | Full no-ops | Original positives/no-ops | Guard positives/no-ops | New positives/no-ops |
| --- | --- | --- | --- | --- | --- |
| Lexical | 60/60 | 4/54 | 30/30; 4/24 | 18/18; 0/18 | 12/12; 0/12 |
| Drop request | 58/60 | 26/54 | 28/30; 12/24 | 18/18; 12/18 | 12/12; 2/12 |
| Mask arguments | 36/60 | 20/54 | 22/30; 8/24 | 10/18; 12/18 | 4/12; 0/12 |
| Policy guard | 48/60 | 12/54 | 30/30; 8/24 | 14/18; 4/18 | 4/12; 0/12 |
| Local bindings | 54/60 | 38/54 | 30/30; 14/24 | 18/18; 16/18 | 6/12; 8/12 |

Local bindings recovers `implicit-refund` and `policy-without-magic-word`, with
complete original refund evidence, and retains active backtick policy subjects.
It removes the original native array query's unwanted evidence. All prior
40 applicability queries retain their lexical terms, which establishes neither
semantic applicability nor extraction quality.

The new cases reject the candidate despite those gains. Separating a local
sorting instruction and a refund implementation request into sentences preserves
refund evidence, but combining them into one sentence loses it. Numeric policy
limits and negated sorting also erase the refund argument. These three failed
positive cases recur in both repeats and both export modes. Local function names
and backtick variable names still retrieve unrelated refund evidence. Six prior
no-op cases also fail, including CSS and incidental layout/ordering terms.
Sentence-local masking therefore fails recall preservation and complete no-op
acceptance, and remains evaluation-only. No production change is justified.

All [1,140 raw rows](final/results.json) retain queries, terms, source sets,
missing original sentences, exact quotations, XML and component timings. Citation
and 500-token gates pass. Judgments/evidence are stable across the two fresh
repeats. All 720 rows shared with the November 1 policy-guard comparison preserve
queries, terms, evidence, XML and judgments. The verifier checks the prior manifest
hashes rather than requiring obsolete compiled evaluator hashes to remain current.

## Verification and remaining work

Full build, workspace typechecks, website lint and 291 deterministic tests pass;
one opt-in real-model test is skipped. Totals are 142 engine, 30 hooks,
102 website, seven Claude Code and ten Codex. The initial restricted test run
failed eight process tests due to unavailable sockets; the local-IPC run passes.
The restricted Next.js build was interrupted after stalling; the full build with
local process access passes. Build-generated `next-env.d.ts` changes were restored,
then typechecks and lint passed again. Ten focused scope tests pass. The November 7
parser and November 1 policy-guard evidence verifiers passed before rebuilding the
changed evaluator; this record independently pairs the prior scope evidence.

[Check results](checks/checks.json) and sanitized logs are retained. Publication
hashes cover raw-to-published log normalization; the manifest covers every record
file except itself. The verifier recomputes scores/subsets, complete sentence
recall, ordering, exact citations and token counts, compiled/source identities,
repeat stability and the 720 paired prior rows.

```sh
node packages/engine/evaluation/records/2026-11-07/local-bindings-followup/verify-evidence.mjs
npm run eval:query-scope -- --corpus local-bindings --out /tmp/othie-local-bindings-new --repeats 2
```

The evaluation command exits 1 for completed failed acceptance gates. No clean
installation or audit refresh was repeated because dependencies are unchanged;
the November 7 parser record remains the latest audit evidence. No remote CI
inspection, push, native/model session or adapter latency probe was performed.
New controls still need macOS/Windows CI. Interactive trust, native Windows
sessions, provider developer-context consumption, larger corpora, signing and
model redistribution remain separate acceptance work.

Next scope work must distinguish local and policy intent within the same sentence,
handle negated operations and quoted/function identifiers, and preserve implicit
policy subjects, all qualifiers and opposing requirements. Keep all three subsets
and failed cases. Passing this diagnostic corpus alone would still not establish
semantic generalization or end-to-end native-hook latency acceptance.
