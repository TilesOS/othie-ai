# Clause binding scope follow-up

Recorded November 8, 2026 in America/New_York, on macOS arm64 with Node.js
24.18.0. Implementation commit `66c7154` adds an evaluation-only candidate and
17 diagnostic cases. Production retrieval and dependencies are unchanged.

## Hypothesis and protocol

The preceding local-binding candidate lost three positive cases when numeric
or negated sorting cues shared a sentence with a policy subject. The new
`clause-bindings` candidate separates punctuation and selected imperative
conjunctions outside quotes and parentheses. It erases complete balanced calls
(including function names and nested calls) and optionally quoted variable names
only in clauses with local operation cues. Numeric vocabulary alone no longer
triggers erasure. Simple negation and company-document cues protect the clause.
Literal-rendering phrases are removed before clause detection; the prior CSS
heuristic remains. This is a prose heuristic, not a code or intent parser.
No document content, source names, expected labels or fixture IDs enter it.

The [protocol](final/protocol.json) retains all 57 prior cases and all five prior
strategies. Seventeen added cases cover same-sentence mixed work, nested and
quoted calls, active quoted subjects, negation placement, apostrophes and
trailing qualifications. These were authored with the hypothesis, not held out.
Default, policy-guard and local-binding corpus options keep their prior cases
and strategies; select this extension explicitly with `--corpus clause-bindings`.

Two fresh seeded SQLite/Lance repeats per export mode reverse case order and
rotate strategy order. Providers are disabled. Reference excerpts and manually
seeded whole-document authoritative rules isolate scope from extraction and
grouping. Positive recall requires every original sentence, including exceptions
and both opposing export requirements. Extra positive sources are reported
separately; no-ops require empty evidence. Timings are components only and do not
establish native-hook latency, model quality or generalization.

## Results

The [summary](final/summary.json) is identical across export modes. Counts include
two controlled repeats, not independent samples. Each subset cell shows positive
recall followed by successful no-ops.

| Strategy | Full positives | Full no-ops | Original | Guard extension | Binding extension | Clause extension |
| --- | --- | --- | --- | --- | --- | --- |
| Lexical | 82/82 | 4/66 | 30/30; 4/24 | 18/18; 0/18 | 12/12; 0/12 | 22/22; 0/12 |
| Drop request | 80/82 | 32/66 | 28/30; 12/24 | 18/18; 12/18 | 12/12; 2/12 | 22/22; 6/12 |
| Mask arguments | 44/82 | 28/66 | 22/30; 8/24 | 10/18; 12/18 | 4/12; 0/12 | 8/22; 8/12 |
| Policy guard | 56/82 | 16/66 | 30/30; 8/24 | 14/18; 4/18 | 4/12; 0/12 | 8/22; 4/12 |
| Local bindings | 62/82 | 46/66 | 30/30; 14/24 | 18/18; 16/18 | 6/12; 8/12 | 8/22; 8/12 |
| Clause bindings | 78/82 | 50/66 | 30/30; 14/24 | 18/18; 16/18 | 12/12; 12/12 | 18/22; 8/12 |

The candidate recovers all three preceding positive failures and resolves both
function-name and backtick-variable collisions. All positives in the prior
57-case corpus survive (60/60 per mode across repeats), with 42/54 prior no-ops.
The prior original/guard subsets retain six failed no-op cases: generic
`through`, `width`, and local chart vocabulary still retrieve unrelated evidence.

Two new positives fail: a trailing company-document qualification loses the
isolated export subject, and an adverb between negation and sorting loses the
refund subject. Two new no-ops also fail: negated sorting retains `request`, and
a negated company-policy cue protects a local call. These four failures recur
in both repeats and export modes. Clause-local negation/cue protection therefore
fails acceptance; the candidate is not adopted.

The initial test expected the trailing-company query to fail, but its retained
"customer records" independently recovered both export sources. That observation
is preserved: the original query now has a passing expectation, and a new paired
query using "results" isolates the lost subject and fails recall. The
[initial source snapshots](initial/) and [failed test log](checks/focused-initial.txt)
retain that iteration. A boundary guard that skipped punctuation after word
characters was also corrected before final evaluation; a direct regression
checks a negated-policy clause followed by local sorting.

All [1,776 rows](final/results.json) retain queries, terms, XML, evidence and
complete-sentence judgments. Exact citations and 500-token gates pass. Evidence
and judgments are stable across fresh repeats. All 1,140 rows shared with the
preceding local-binding record preserve queries, terms, XML, evidence and scores.
All 40 prior applicability queries keep lexical terms under the new strategy;
this does not establish applicability or extraction quality.

## Verification and CI

Full workspace build, typechecks, website lint and 296 deterministic tests pass;
one opt-in real-model test is skipped. Totals are 147 engine, 30 hooks,
102 website, seven Claude Code and ten Codex. Fifteen focused scope tests pass.
The build and process tests ran with local process/IPC access. The generated
`next-env.d.ts` path was restored before final typechecks and lint. The preceding
local-binding evidence verifier passed before rebuilding the changed evaluator.

The [run for `4c34b0f`](https://github.com/TilesOS/othie-ai/actions/runs/42516720548)
passes Windows installation, typechecks, website lint, tests and startup syntax.
Its macOS job was cancelled with no recorded steps, and the run is cancelled
overall. The [revision/job record](checks/ci-4c34b0f.json) closes the preceding
parser/reachability/local-binding history's Windows CI gap only. macOS CI for
that history and both runners for the new clause controls remain open. The local
`gh` credential check failed; the connected GitHub tools supplied this read-only
run/job inspection. No workflow was rerun and no commits were pushed.

[Check metadata](checks/checks.json), sanitized logs, source/compiled hashes,
publication hashes and a complete file manifest accompany the evidence. The
verifier independently checks scores, four subsets, every original sentence,
ordering, repeat stability, paired prior rows, citation/token gates, source
identity, initial iteration and partial CI.

```sh
node packages/engine/evaluation/records/2026-11-08/clause-bindings-followup/verify-evidence.mjs
npm run eval:query-scope -- --corpus clause-bindings --out /tmp/othie-clause-bindings-new --repeats 2
```

The evaluator exits 1 for completed failed acceptance gates. No dependency change,
clean install, audit refresh, native/model session or adapter latency probe was
performed. The November 7 parser record remains the latest audit evidence.
Interactive trust, native Windows sessions, local-provider developer-context
consumption, larger corpora, signing and redistribution remain separate work.

Next distinguish instruction negation from negated policy lookup, connect trailing
qualifications to the actual subject, and handle generic prose/layout vocabulary.
Preserve all 74 cases and four separate subsets. Further heuristic gains on these
co-developed cases require independent validation before production adoption.
