# Othie verification

Updated October 29, 2026 on macOS with Node.js 24.18.0. The preceding October 14
combined verification ran on Linux with Node.js 24.19.0. Earlier model and native-host
observations below were also recorded on macOS with Node.js 24.18.0. The deterministic suite uses
synthetic documents and provider fixtures; it requires no model training or downloads.

## Checks run

| Check | Result |
| --- | --- |
| `npm ci` | October 29 clean installation passes with the existing dependency lockfile |
| `npm run build` | All workspaces pass; Next.js 16.4.3 exports the website routes |
| `npm run typecheck` | All workspaces pass |
| `npm test` | 198 passing tests; one opt-in real-model test skipped |
| MCP/lifecycle/cross-host and latency tests within `npm test` | Eight engine process tests pass |
| Compiled hook latency evaluator, three repeats | 24/24 delivery and default 2,000 ms gates pass; parent process wall time 578–662 ms on the synthetic lexical workload |
| Combined-history strict evaluator checks | Fresh engine 14/14, including stall controls; actual-default normal paths 8/8 |
| October 18 native Claude settings discovery | 20/24 checks pass; shared root settings fail all four nested-launch delivery checks and remain recorded |
| October 18 serial adapter latency | Fresh-engine 14/14 at 2,000/3,000 ms budgets; actual-default normal paths 8/8 at 315–442 ms |
| October 20 native Codex project discovery | Trusted project hooks pass 8/8 from root/nested launches; session baseline 4/4; original project-trust probe fails 0/4 and remains recorded |
| October 20 Codex local-model consumption | Complete cited adapter delivery 4/4; native answers 3/4, with positive answer still `unknown` |
| October 20 serial adapter latency | Fresh-engine 14/14 at 2,000/3,000 ms budgets; actual-default normal paths 8/8 at 256–276 ms |
| October 23 native Codex scorer/dependency refresh | Hosted project hooks 4/4; final local-model delivery 4/4 but native answers 3/4 |
| October 23 local provider transport and role probes | Complete positive policy reaches developer message; original developer requests 0/3, system/user role interventions 12/12; minimal absent-policy control 2/3 |
| October 23 serial adapter latency | Strict fresh-engine 14/14 at 2,000/3,000 ms budgets; actual-default normal paths 8/8 at 311–372 ms |
| October 24–25 native Codex coding-agent pilot | 21/21 operational sessions; Othie and full documents each 7/7 tasks and 46/46 probes; task-only 3/7 tasks and 31/46 probes |
| Late-query retrieval regression | Preserves tail subjects beyond the old 20-term prefix, including a 4,000-term query through SQLite, excerpts and rule selection |
| October 25 hosted project-hook controls | Positive, no-op, revoked and unavailable sessions pass 4/4 with complete cited positive evidence |
| October 25 serial adapter latency | Strict fresh-engine 14/14 at 2,000/3,000 ms budgets; actual-default normal paths 8/8 at 260–275 ms |
| October 28 native multi-file comparison, two repeats | 18/18 operational sessions; full documents 6/6 complete gates and 64/64 probes; Othie 4/6 gates and 64/64 probes with both no-op failures preserved; task-only 2/6 and 45/64 |
| October 28 request-identifier diagnostic | Original array task retrieves four refund excerpts on `request`; query-only identifier intervention retrieves none; refund-positive control still retrieves four |
| October 28 hosted project-hook controls | Positive, no-op, revoked and unavailable sessions pass 4/4 |
| October 28 serial adapter latency | Strict fresh-engine 14/14 at 2,000/3,000 ms budgets (261–2,037 ms); actual-default paths 8/8 at 262–278 ms |
| October 29 query-scope shadow comparison | 324 results; per export mode lexical 30/30 recall and 4/24 no-ops; removing `request` 28/30 and 12/24; argument masking 22/30 and 8/24; both interventions fail acceptance |
| October 29 prior-history CI inspection | `9f416fe` passes macOS and Windows installation, typechecks and 193 tests; Windows startup syntax passes |
| `npm run lint --workspace=@othie/website` | Pass |
| Local compiler-quality evaluator, deterministic follow-up | Final: standard 42/42; extended 75/78; adversarial 123/126; boundaries 153/168 with one instruction-promotion coverage failure and two no-op failures |
| Evaluation-only semantic applicability, initial trials | Boundaries 42/56 versus lexical 51/56; larger applicability corpus 54/80 versus paired lexical 61/80; both fail acceptance |
| Evaluation-only anchored applicability, three controlled repeats | 61/80, 65/80, 61/80 versus lexical 61/80 each; positive recall regresses and 75/96 model calls exceed the default hook deadline |
| Evaluation-only source-revision candidates | Pre-packing positive coverage 26/26 versus lexical 23/26; filtered packed diagnostics 65/80 versus 61/80, with positive recall regression and 27/32 calls missing the hook deadline |
| Fixed recorded-input applicability replay, three repeats | 96/96 valid decisions; eight queries vary; pre-packing diagnostics 23/32, 22/32, 21/32; 77/96 calls miss the hook deadline |
| Recorded-input replay with actual 2,000 ms generation deadline | 7/32 valid responses; 25 failed attempts return without decisions around the deadline; pre-packing diagnostics 4/32; fails acceptance |
| `git diff --check` | Pass |
| `npm audit` and `npm audit --omit=dev` | Zero reported development or production dependency advisories |

The full suite comprises 137 engine, 30 shared-hook, 14 website, 10 Codex, and seven
Claude Code tests. Process tests require access to local Unix sockets or Windows named
pipes; they were run with local socket access outside the restricted command sandbox.

The [GitHub Actions run for code commit 504c27f](https://github.com/TilesOS/othie-ai/actions/runs/37093664926)
also passes on `macos-14` and `windows-latest`: clean `npm ci`, all workspace typechecks,
the then-current 93 tests, and the Windows startup-script syntax check. A pre-existing
Windows fixture used `URL.pathname` to launch a local CLI; it now uses `fileURLToPath`.
The [GitHub Actions run for commit 19a9dfe](https://github.com/TilesOS/othie-ai/actions/runs/37260102983)
also passes on both runners with the then-current 118 deterministic tests, typechecks,
clean installation, and Windows startup-script syntax check. This verifies the previous
October 3–4 changes on Windows. The [GitHub Actions run for commit 61279ff](https://github.com/TilesOS/othie-ai/actions/runs/37264456510)
also passes both macOS and Windows jobs: clean installation, all typechecks, the
then-current 136 deterministic tests, and Windows startup-script syntax. This run was
inspected during the earlier follow-up and verifies the preceding coverage, relevance,
and classification commits. The [run for commit 9c7ba51](https://github.com/TilesOS/othie-ai/actions/runs/37403113033)
was inspected October 6 and passes both macOS and Windows jobs: clean installation,
all typechecks, the then-current 143 tests and Windows startup-script syntax. This
verifies the previously unverified deterministic-selection, classification and dependency
commits. The [run for commit 8d8243f](https://github.com/TilesOS/othie-ai/actions/runs/37569998793)
was inspected October 8 and passes both macOS and Windows jobs: clean installation,
all workspace typechecks, the then-current 150 tests and Windows startup-script syntax.
This verifies the October 6 dependency and applicability changes. The
[run for `7eb19f8`](https://github.com/TilesOS/othie-ai/actions/runs/37877299841), inspected
October 14, passes clean installation, workspace typechecks and tests on both runners,
plus Windows startup-script syntax. This verifies the October 8 evaluator changes.
Startup-deadline changes through `c410e6f` also pass both runners. The
[merged-history run for `449c3fc`](https://github.com/TilesOS/othie-ai/actions/runs/38682973490),
inspected October 18, passes both macOS and Windows jobs, including clean installation,
typechecks, the then-current tests and Windows startup-script syntax. The
[run for `ff38e75`](https://github.com/TilesOS/othie-ai/actions/runs/40159571222), inspected
October 25, passes both macOS and Windows jobs: clean installation, workspace typechecks
and tests, plus Windows startup-script syntax. This now verifies the October 18, 20 and
23 follow-ups.
The [run and job evidence](packages/engine/evaluation/records/2026-10-24/native-agent-followup/checks/ci-ff38e75.json)
records the inspected revision and individual steps. Automated runner results do not
establish native desktop-host or logon-startup acceptance.

The [run for `5da7f3e`](https://github.com/TilesOS/othie-ai/actions/runs/40162718803),
inspected October 28, also passes both macOS and Windows jobs: clean installation,
workspace typechecks and the 189-test suite, plus Windows startup-script syntax.
This verifies the October 24–25 native-agent harness and late-query retrieval changes.
The [run and step record](packages/engine/evaluation/records/2026-10-28/multi-file-followup/ci-5da7f3e.json)
retains the full checked revision.

The [run for `9f416fe`](https://github.com/TilesOS/othie-ai/actions/runs/40813801524),
inspected October 29, passes clean installation, workspace typechecks and the
193-test suite on macOS and Windows, plus Windows startup-script syntax. This
verifies the multi-file module-grader, corpus, integrity and no-op diagnostic history.
The [run and step record](packages/engine/evaluation/records/2026-10-29/query-scope-followup/ci-9f416fe.json)
retains the full revision and both jobs. New query-scope evaluator commits still
need CI; automated jobs do not establish native Windows host/session acceptance.

## Delivery and credential coverage

Both compiled hook entry points were exercised against a live engine using synthetic
support policies. They return identical cited context under a 500-token engine cap and
stay silent for a repository-only task. Tests cover another profile's sources, a working
directory pointing at that unauthorized profile, invalid credentials, source deletion,
engine restart, and replacement evidence. These tests launch hook processes, not the
native Codex or Claude Code applications.

Shared fixtures cover invalid or mismatched responses, absolute/traversing citation
labels, fabricated token counts, accurate over-budget responses, unsupported tokenizers,
missing citations, malformed synthesis/conflicts, deadlines, and late results. Compiled
process tests cover stalled stdin, oversized multibyte input, and missing CLI files.
Opt-in diagnostics are checked against a fixed allowlist and exclude content, paths,
profile names, session identifiers, credentials, and subprocess errors.

Credential tests cover secret rotation, preservation of other grants, verifier-free
listing, POSIX file permissions, corrupt-store preservation, exclusive update locks,
invalid default profiles, inherited-property rejection, and live CLI revocation without
restarting the engine. Credential stores are published by atomic rename from a synced
temporary file. A crash can leave an update lock requiring inspection; the engine guide
documents that recovery procedure. Already-authorized requests may be in flight when
a grant is revoked.

## Website patch verification

The browser checks in this section were recorded October 2. Build, typecheck, tests,
and lint were rerun October 6; browser/UI acceptance was not repeated for engine/evaluator
and dependency edits.

Next.js and its ESLint configuration were updated together from 16.3.4 to 16.3.8;
transitive brace-expansion dependencies were updated within their existing version
ranges. The production build exports home, download, pricing, privacy, and developer
setup pages. The agent-browser check loaded the home page, followed the download link,
selected the Windows target, and followed developer setup at a 390 × 844 viewport.
Desktop/mobile screenshots were inspected. Home and download checks found no framework
error overlay or horizontal overflow; browser error reports remained empty through setup.
Installer availability still fails closed.

The October 2 audit recorded five development-tool findings in the
ESLint/fast-glob/micromatch/braces chain. That audit offered a downgrade to an older Next.js ESLint configuration,
so that incompatible change was not applied. These are separate from the clean production
dependency audit.

## October 3 acceptance follow-up

The [committed acceptance records](packages/engine/evaluation/records/2026-10-03/README.md)
include native host transcripts, 36 coding-agent trajectories, and two compiler-quality
reports. They contain only synthetic fixtures; personal host paths were redacted.

Native Codex CLI 0.156.1 (`gpt-6-astra`) and Claude Code 2.1.283
(`claude-opus-5-5`) each passed positive canary delivery, repository-only no-op, live
credential revocation, and engine-unavailable sessions. Codex used invocation-local hook
configuration with one-shot trust for the generated hook; Claude used explicit settings.
These are noninteractive native CLI sessions, not desktop UI or persisted trust acceptance.
A Codex project-file discovery probe did not execute the hook in this isolated launch.
Codex with the installed local Ollama model executed the adapter but answered `unknown`
for positive context, so local-model consumption acceptance remains open.

The native no-op check revealed a lexical false positive: "Do not use tools" matched a
policy only on `not`. That generic query term is now excluded from keyword relevance,
while source negations remain intact. Both native sessions and the cross-host live-engine
suite verify the fix.

The fixed local coding-agent harness compares task-only, full-document, and Othie
conditions with fresh workspaces, read/edit/test tools, hidden behavioral scoring,
model/fixture hashes, rotated condition order, and an explicit no-op control. Across
three repeats, full documents and Othie each passed 9/12 tasks and 60/66 hidden probes;
task-only passed 0/12 tasks and 33/66 probes. All conditions missed the sorting control's
uniqueness requirement. Othie correctly injected nothing for all control repeats.
Cumulative input tokens were 27,296 for full documents and 27,618 for Othie, so this small
corpus does not demonstrate token savings. This constrained-tool benchmark uses lexical
excerpt fallback, not model compilation or native host coding tools.

The model-quality TODO is replaced by an executable seven-case corpus at 200 and 500
tokens, with real extraction and rules-only export. The original prompt retained five
rules and passed 6/14 source/qualifier diagnostics; the clarified `rules-v2` prompt retained
ten and passed 7/14 in one subsequent run. Both preserved exact retained citations,
reference isolation, and token caps. Receipt/contractor omissions, tight-budget qualifier
loss, and differing conflict labels remain failures. The opt-in test gates safety and
operational completion, separately reporting quality failures. Prompt changes now trigger
startup reindexing rather than leaving unchanged documents with obsolete extraction.

## Compiler follow-up

The [compiler follow-up records](packages/engine/evaluation/records/2026-10-03/compiler-followup/README.md)
preserve seven additional synthetic runs, including failures found during iteration.
The final implementation uses numbered sentence selection with short invocation-local
source IDs (`rules-v4`). Rule text and quotations are recovered from original source
spans, and syntactically marked follow-up qualifications remain attached. Verbatim XML
includes identical rule text and evidence once; structured citations still retain the
full quotation. Invalid ranges and oversized spans are rejected without truncation.

Exact opposing source statements now produce a conflict even when generated category
and scope labels differ. Quality protocol `quality-v2` requires that flag, whereas the
older reports did not score it. Repeated evaluation also uncovered an unrelated-query
injection through the generated word "invalid" and a dropped travel policy caused by
a mistyped 64-character source ID. Lexical rule selection now uses rule text/evidence
instead of generated labels, and extraction uses short source aliases. Regression tests
cover these failures, source provenance, whitespace, qualification attachment, citation
integrity, and complete receipt evidence at a 200-token cap.

Three final runs with the same installed `qwen3.5:4b-mlx` digest pass 11/14, 10/14,
and 11/14 diagnostics (32/42 total). All 21 diagnostics at 500 tokens pass, including
both no-op controls and opposing-rule detection. At 200 tokens, only 11/21 pass:
whole-item packing still omits needed evidence, and generated label length/rule grouping
vary. Each run completes with exact retained citations, no reference rules promoted,
unchanged model identity, and accurate hard caps. These are repeated observations of
one small fixed corpus and one model, not statistical evidence or a semantic proof.

The full workspace build, typechecks, website lint, and production dependency audit
pass. All 113 deterministic tests pass with local socket access. A sandboxed attempt
failed to bind integration sockets and stalled the Next.js build; rerunning with the
required local access passed. No native host/desktop/Windows acceptance was repeated
for these compiler changes, and no model artifacts were downloaded or distributed.

## October 4 compiler packing and extraction follow-up

The [October 4 records](packages/engine/evaluation/records/2026-10-04/compiler-followup/README.md)
preserve five fresh synthetic evaluations, including the intermediate and final failures.
Verbatim XML now excludes generated category/scope labels, retaining them only as advisory
metadata in the structured brief. Consecutive whole rules from one original revision,
location, and authority share a citation in XML. Tests verify that different sources,
revisions, locations, or authorities cannot be grouped, and that long generated labels
cannot displace either side of the export conflict at 200 tokens.

The first fresh run exposed another source-ID failure: the model used sentence numbers
to invent `s2` and `s3` for the only supplied source, `s1`. `rules-v5` adds an invocation-specific
source-ID enum to the response schema and distinguishes IDs from sentence numbers in the
instructions. Unknown IDs remain rejected, and the prompt version triggers startup
reindexing. Evidence still comes from original, complete source spans.

Quality protocol `quality-v4` excludes generated labels and unrelated source files from
qualifier scoring; whole-word numeric checks prevent `written` from satisfying `ten`.
Older scores used different rules, so they are not directly comparable acceptance scores.
The three final repeats pass 14/14, 12/14, and 14/14 diagnostics: 20/21 at each cap.
Both conflict sides and both no-op controls pass in every repeat. The failed repeat omits
the non-EU telemetry default during extraction; it loses the same qualifiers at both
caps, with no telemetry items omitted by packing. Selection completeness therefore
remains open even though two reports pass this small fixed corpus.

All five runs complete with exact retained citations, unchanged installed model digest,
no reference rules promoted, and accurate token accounting/caps. Full workspace build,
typechecks, website lint, production dependency audit, and 118 deterministic tests pass
locally with the required process/socket access. No model weights were downloaded or
distributed. Native host/desktop acceptance and Windows verification were not repeated.

## October 4 sentence coverage and mixed-source follow-up

The [coverage follow-up records](packages/engine/evaluation/records/2026-10-04/coverage-followup/README.md)
preserve 18 synthetic evaluations, including unsuccessful classification trials and six
final retained-code repeats. `rules-v6` requires every authoritative sentence to appear
in recovered rule evidence or an explicit non-policy disposition. Unknown IDs, invalid
or oversized selections, incomplete coverage, and contradictory/duplicate exclusions
reject the complete response; the durable queue retries without publishing partial rules.
Tests verify recovery after an incomplete response and reject policy ranges swallowing
an explicitly excluded model instruction. Prompt upgrades still trigger startup reindexing.

`quality-v5` now scores every expected policy sentence in the fixed fixtures independently
of retrieval diagnostics, and detects retained non-policy/reference sentences. Job attempt
counts expose retries. The standard corpus preserves the original seven cases; an extended
corpus adds four authoritative documents and six cases for regional defaults, mixed-source
classification, linked access exceptions, long evidence, and two additional no-op controls.
Keyword hits in unrelated source sentences no longer promote a rule: each rule must match
the query in its own evidence. Actual vector hits and global rules retain their existing
behavior. A deterministic mixed-source regression reproduces and verifies this relevance fix.

Final code `41df142` passes 14/14 standard diagnostics in all three repeats (42/42), with
every expected policy sentence retained. One repeat recovers telemetry and travel after
rejected extraction responses. All three extended repeats score 19/26 (9/13 at 200 tokens,
10/13 at 500). They retain all expected policy but also promote the maintenance source's
two descriptive sentences and model-directed instruction. Three no-op cases fail at both
caps. The long incident requirement is extracted but omitted at 200 tokens; its diagnostic
passes at 500. No scoring exception or truncated evidence masks these failures.

An initial extended repeat explicitly classified the non-EU telemetry default as descriptive,
which coverage bookkeeping alone cannot reject. Prompt-only and sentence-only classification
trials also misclassified evidence; one sentence-only repeat excluded the whole leave policy.
Those trials are preserved but not retained in code. Semantic classification and general
selection completeness therefore remain open despite the final standard corpus passing.

All 18 runs complete with unchanged installed model digest, exact retained citations,
no vendor reference rules promoted, and accurate hard caps. Instruction promotion within
an authoritative source is a separate observed failure. These fixed, unseeded local runs
provide no statistical or general quality claim. Full build, typechecks, website lint,
and 128 deterministic tests pass locally with process/socket access; the production
dependency audit is clean. No model artifacts were downloaded or distributed. Native
host/desktop acceptance was not repeated; CI for the preceding head passes on macOS and
Windows, while the new local commits still need their own Windows CI.

## October 5 compiler classification follow-up

The [classification follow-up records](packages/engine/evaluation/records/2026-10-05/classification-followup/README.md)
preserve 11 full synthetic evaluations and two isolated probes, including failed runs.
`rules-v9` first classifies each original sentence with an inspection explanation, then
selects complete policy ranges. The engine requires complete classifications and rejects
recovered evidence or exclusions that contradict them. Qualification attachment stops at
classified non-policy boundaries. Explanations never become policy evidence. Both model
requests use the same approved extraction provider and share a deadline and shutdown
signal; all-non-policy sources skip selection. The prompt upgrade triggers startup reindexing.
Tests cover identities, coverage, exclusions, qualification boundaries, cancellation,
and durable recovery without publishing an instruction swallowed by a rejected range.

Three fresh standard repeats pass 42/42 diagnostics. Three extended repeats pass 75/78,
with complete expected policy/non-policy coverage in every run: 36/39 at 200 tokens and
39/39 at 500. Each excludes the maintenance source's descriptions and instruction. Only
long incident-report evidence still fails at 200 tokens. Standard/extended fixture hashes
and `quality-v5` scoring are unchanged from the preceding records. The extra classification
request adds indexing work; this result does not establish general semantic acceptance.

A separately scored adversarial superset adds six authoritative documents and eight cases,
for 16 authoritative documents, 36 expected policy sentences, 13 expected non-policy
sentences, and 21 retrieval cases. It probes history, a quoted display title containing
"must", varied model instructions, legitimate assistant-use policies, qualification
boundaries, and an all-non-policy source. New evaluator metadata records schemas/options
alongside messages and raw outputs; early repeats lack these additive fields.

Adversarial repeat 1 reaches the 180-second evaluator deadline with one extraction job
pending after seven attempts; operational gating makes all 42 diagnostic scores false.
It also promotes the quoted display title. Repeat 2 completes at 38/42 with that title
still retained. Repeat 3 completes at 38/42 with exact expected sentence coverage. Both
completed repeats lose maintenance notice and long incident evidence during 200-token
packing among overlapping policy vocabularies. Their descriptive no-op fails at both caps:
even with correct classification, "seventeen minutes" matches a support policy on the
single word "minutes". Their instruction and all-non-policy controls pass. Generated
selection can ignore correct classifications, causing rejection and repeated work.

The old `rules-v6` extractor, evaluated once in an isolated temporary build with the same
new fixtures/scoring/retrieval, completes at 28/42 while retaining non-policy or model
instructions from five authoritative documents. This is one unseeded comparison, not a
causal quality or latency estimate. A shorter selector prompt tested on three failed
sources still crosses exclusions and is not retained. All failures remain recorded.

Every full report preserves exact retained citations, vendor reference isolation,
accurate hard caps, and unchanged installed model digest, including the incomplete run.
These checks cannot reject a semantically incorrect classification. Full workspace build,
typechecks, website lint, production audit, and all 136 deterministic tests pass locally
with process/socket access. Native host/desktop acceptance and current Windows CI were
not repeated; no model artifacts were downloaded or distributed.

## October 5 deterministic extraction and relevance follow-up

The [deterministic follow-up records](packages/engine/evaluation/records/2026-10-05/deterministic-followup/README.md)
preserve the completed synthetic trials and subsequent repeats. `rules-v10` replaces
model range selection with deterministic evidence recovery from complete classifications.
Every classified policy sentence is selected in source order; syntactic qualifications
stay attached inside classified policy boundaries, and identical recovered spans are
deduplicated. One approved model request supplies classifications and inspection-only
explanations. Fixed category/applicability metadata makes no generated subject/scope
claim. Invalid or incomplete decisions and oversized evidence still reject the complete
job, with durable retries and no partial publication. The prompt version reindexes
unchanged documents. Implicit evidence relationships remain open.

The initial adversarial trial completes at 38/42 with one attempt per source but still
promotes the quoted title, matches a support deadline on "minutes", and loses maintenance
notice/long incident evidence at 200 tokens. Tighter lexical relevance excludes generic
quantities/time units as sole matches and weights evidence by corpus rarity and length.
Independently relevant statements sharing source revision, location, and authority stay
together for packing. Global rules and actual vector hits remain eligible; duration-only
queries now need a subject or vector hit. The relevance-only trial scores 39/42, fixing
the maintenance packing loss and unrelated support hit while retaining the title error.
A live MCP test covers subject-based delivery and duration-only no-op.

`rules-v11` clarifies the distinction between an assertion about quoted/display/historical
wording and an active policy, including actively quoted policy and legitimate employee
assistant-use restrictions. Standard, extended, and adversarial fixtures and `quality-v5`
scoring are unchanged. The new separately scored `boundaries` superset adds four
authoritative documents and seven cases for active quoted policy, historical replacement,
assistant use, conditional procedures, and historical/example/instruction no-op controls.
Expected coverage and controls remain fixed despite observed failures.

The three `rules-v11` repeats score 40/42 standard, 75/78 extended, 123/126 adversarial,
and 151/168 boundaries. All jobs complete in one attempt. Standard repeat 2 labels both
leave entitlements descriptive despite explaining their entitlement effect, losing policy
at both caps. Boundaries repeat 3 excludes the approved-assistant summary permission as
a model instruction and loses another assistant clause during 200-token packing. These
classification failures remain recorded. The other larger-corpus runs retain exact
expected policy/non-policy coverage; all adversarial no-op controls pass, and only long
incident evidence fails there at 200 tokens. Boundaries also fail historical-badge and
customer-directory no-op controls at both caps because of generic subject-word overlap.

`rules-v12` clarifies factual entitlements and bounded permissions for approved assistants
and asks the model to check its explanation against the final kind. Bare numeric quantities
are also excluded as sole lexical matches. The subsequent `entitlement-*` repeats keep
the same corpus hashes and scoring; their reports are preserved alongside the earlier
failures. Final repeats score 42/42 standard, 75/78 extended, 123/126 adversarial, and
153/168 boundaries. Standard, extended, and adversarial repeats all have exact expected
sentence coverage; only long incident evidence fails there at 200 tokens. Boundaries
still fail two generic subject-word no-op controls at both caps. One of the three
boundaries runs promotes the direct assistant instruction as policy, inventing a
prohibition explanation absent from the source. Later repeats exclude it; this is an
observed semantic safety failure, not a resolved classification guarantee.

All 26 full reports complete with one attempt per extraction job, exact retained citations,
reference isolation, unchanged installed model digest, and accurate hard caps. The
manifest records report/generation hashes. Controlled generation settings, additional
models, implicit evidence links, and semantic applicability remain open. Model
classifications remain semantic judgments beyond structural validation. The temporarily
started loopback model service was stopped after verification; no artifacts were downloaded
or redistributed.

The fresh full workspace build, typechecks, website lint, and 143 deterministic tests
pass after `npm ci`, including process/socket tests and a synthetic DOCX ingestion test.
No native host/desktop or Windows hardware acceptance was repeated. The previous head's
macOS/Windows CI was verified; these new local commits still need their own CI.

## October 5 dependency audit follow-up

A fresh audit reports production findings absent from the preceding recorded audit:
[`source-map-js` indexed-offset denial of service](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
and [`sprintf-js` precision handling](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
through Mammoth's legacy CLI-only argparse dependency. The source-map dependency is
updated from 1.2.1 to patched 1.2.2 within its existing ranges. A scoped Mammoth override
pins argparse 2.0.1, removing the unpatched formatter chain while retaining Mammoth
1.12.2. DOCX ingestion through the isolated parser passes; the bundled Mammoth CLI help
and synthetic conversion also pass with upstream compatibility-alias deprecation warnings.
Clean installation reproduces the dependency tree. `npm audit --omit=dev` again reports
zero advisories. The five development-tool findings in the previously recorded
ESLint/fast-glob/micromatch/braces chain remain; audit still proposes downgrading the
Next.js ESLint configuration to 14.2.35, which was not applied.

## October 6 production dependency and applicability follow-up

A refreshed production audit finds two newly reported advisories:
[MCP client OAuth issuer binding](https://github.com/advisories/GHSA-6qxp-vccf-f47h)
and [Sharp's bundled librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
Client, server and transitive core move together from 2.0.0 to 2.3.1; the Sharp override
moves from 0.35.4 to 0.35.5. The OAuth advisory concerns HTTP OAuth clients rather than
the stdio clients exercised here. The audit's suggested LanceDB downgrade was not used.
An initial install left the old overridden Sharp lock entry; a targeted refresh and
clean `npm ci` now reproduce the patched tree. Synthetic SVG-to-PNG conversion passes
with Sharp 0.35.5 and librsvg 2.63.2. Production audit reports zero findings; the five
previously recorded development-tool findings remain. Full build, typechecks, website
lint and deterministic/process tests pass after the dependency refresh.

The [applicability records](packages/engine/evaluation/records/2026-10-06/applicability-followup/README.md)
preserve controlled local experiments without changing normal engine context delivery.
The evaluator accepts explicit temperature/seed settings, records effective request
options, and pairs each semantic result with the same extraction's lexical baseline.
The same approved loopback extraction provider evaluates complete original candidates
before whole-rule packing. Empty candidates skip generation, global rules remain
unconditional, and retained rules/quotations/ranking remain original engine objects.
Both caps reuse one query decision. Invalid, incomplete or late responses fail both
scores; baseline evidence stays available for inspection. Model explanations never
enter context. Embeddings and synthesis stay disabled.

The unchanged boundary corpus scores 42/56 versus lexical 51/56 in the first trial:
the filter drops receipt and consent qualifiers, invents intent for historical badge
wording and fails four queries on fabricated or contradictory quotes. A new separately
scored applicability superset retains every original document/case and adds eight
positive tasks and four historical/descriptive/UI controls. The revised prompt scores
54/80 versus paired lexical 61/80. It fixes the initial multi-topic omissions but fails
eight responses structurally, drops an opposing export prohibition and exposes missing
lexical candidates for short support, receipt and telemetry subject queries. A downstream
filter cannot restore evidence absent from its input. Original scores and expectations
remain unchanged; these are failed experiments, not a production relevance fix.

`applicability-v3` replaces generated quotations with supplied task/evidence anchor IDs,
recovering full original text deterministically. Cross-item, unknown, missing, duplicate
or contradictory anchors still reject the complete response. It explicitly keeps
prohibitions when the task requests prohibited behavior. This representation change
does not prove the semantic relationship between task and policy. Controlled generation
settings also do not guarantee determinism or independent observations. The installed
model remains the only available local model; no additional artifacts were downloaded.

Three anchor repeats score 61/80, 65/80 and 61/80 versus paired lexical 61/80 each.
All query decisions are structurally valid, but positive diagnostics fall from
135/156 to 119/156 while no-op diagnostics improve from 48/84 to 68/84. Filtering
still loses receipt boundaries, consent conditions, vacation entitlements or assistant
credential restrictions and retains historical-badge/support-chart false positives.
The recovered policy set is identical across repeats after ignoring order; candidate
ordering and warm state vary, and some decisions vary with identical recorded inputs
and requested settings. These observations do not isolate a cause or establish general
semantic quality. Seventy-five of 96 model calls exceed the hook's default two-second
deadline before transport overhead; observed filtering calls take 1.1–13.3 seconds.

All five reports preserve complete expected extraction coverage, one attempt per source,
unchanged model digest, exact citations, reference isolation and accurate hard caps.
The manifest includes report/generation hashes and paired failures. The temporary model
service was stopped after verification. The filter remains evaluation-only; normal
delivery is unchanged. All 150 deterministic tests and workspace typechecks pass with
the final code; build, website lint and production audit pass after clean installation
of the patched dependency tree. Native host/desktop acceptance was not repeated, and
these local commits still need their own Windows CI.

## October 8 candidate coverage and applicability replay follow-up

The [October 8 records](packages/engine/evaluation/records/2026-10-08/candidate-followup/README.md)
preserve a fresh source-revision candidate experiment with unchanged fixtures, scoring,
`rules-v12`, `applicability-v3`, installed model digest, temperature 0 and seed 42.
Lexical subject hits can experimentally include other extracted whole policies from the
same profile, document, revision, source and authority. Global rules alone do not seed
expansion. This overfetch remains evaluation-only and can add unrelated policies from
mixed-topic sources; it does not prove implicit evidence links or change normal delivery.

Positive pre-packing candidate coverage improves from 23/26 to 26/26, recovering support
escalation, lost-receipt substitution and missing-consent definitions for narrow queries.
The paired packed result is 65/80 versus lexical 61/80. Positive diagnostics regress from
45/52 to 41/52 while no-op diagnostics improve from 16/28 to 24/28. The model still drops
vacation entitlements and an assistant credential prohibition and retains historical-badge
and support-chart false positives. Two export responses have contradictory anchors;
a human-assistant query reaches the 20-second generation deadline. These fail both caps
without hiding baseline evidence. Long incident evidence still fails at 200 tokens.
All extraction jobs complete in one attempt with exact expected sentence coverage,
reference isolation, exact citations, unchanged digest and accurate hard caps.

The evaluator now records candidate coverage before packing and separates positive/no-op
scores. Semantic acceptance independently requires filtering within the native hook's
2,000 ms default; diagnostic requests still allow 20 seconds to preserve slow decisions.
Twenty-seven of 32 nonempty calls miss that necessary latency gate. Generation/validation
time excludes other hook work, so passing would still require end-to-end native acceptance.

A recorded-input replay runner fixes messages, candidate order, schemas, sampling settings
and case order without fresh extraction or re-ranking. It checks the installed digest,
rejects ambiguous or ungrounded inputs, preserves each raw attempt before proceeding,
separates invalid attempts from decision variation, and independently scores retained
source/qualifier/conflict evidence before packing. These scores cannot be compared to
packed `quality-v5` totals. Deterministic regressions cover isolation, missing linked
requirements, overfetch, replay order, provenance, cancellation, late output, changed
models and refusal to overwrite evidence.

Three replays of the October 6 `anchors-1` input hold all 32 nonempty requests fixed.
All 96 responses are structurally valid with unchanged digest, but eight queries have
two distinct applicability decision sets. Before-packing diagnostics score 23/32,
22/32 and 21/32 versus the original recording's 23/32. Positive scores are 19/26,
19/26 and 18/26 versus recorded 20/26; nonempty-candidate no-op scores are 4/6,
3/6 and 3/6 versus 3/6. Eight empty-candidate cases have no replayed model request
and are reported separately. Seventy-seven of 96 calls exceed the hook gate, taking
1.2–12.9 seconds. Fixed ordering therefore does not eliminate observed variation or
resolve recall/latency failure. Runtime internals, warm state and machine load remain
uncontrolled; these are observations without a causal or statistical claim.

An additional replay enforces a 2,000 ms generation deadline on all 32 recorded
requests. Only seven produce valid decisions; 25 fail without raw decisions at
2.000–2.004 seconds as cancellation unwinds. Pre-packing diagnostics pass 4/32.
The installed digest stays unchanged, failed attempts remain inspectable, and the
experiment exits nonzero. Model-only cancellation does not establish a native hook's
end-to-end budget. The temporary model was unloaded and its loopback service stopped.

The final full workspace build, typechecks, website lint, production dependency audit
and 159 deterministic tests pass, with one live-model test skipped. No model weights
were downloaded or distributed. Native host sessions and desktop acceptance were not
repeated. CI through `8d8243f` passes both runners; October 8 local commits still need CI.

## October 13 complete adapter-process deadline follow-up

The [hook latency records](packages/engine/evaluation/records/2026-10-13/hook-latency-followup/README.md)
preserve a new `npm run eval:hook-latency` evaluator, the initial failed regression
output, one preliminary standalone run, and three final fresh-engine repeats using
code `97cbdcb`. Both compiled adapters are invoked directly against synthetic live
engines. Extraction, embeddings and synthesis are disabled; context uses lexical
excerpt fallback. No model artifacts, hosted model API or native host login are used.

The shared runtime now keeps one absolute monotonic deadline across stdin, parsing,
transport, validation and output serialization. Expired budgets never start a query;
late synchronous failures are classified as timeouts even when they delay the timer
callback. Three deterministic regressions fail against the prior runtime and pass
after this change. Module initialization still precedes the internal clock.

The evaluator measures complete process time from before spawn until close, saves
every attempt immediately, hashes compiled entry points and the shared runtime, and
refuses to overwrite evidence. Each repeat creates fresh engine/index/credential state
and alternates host order. Positive delivery preserves the first-response qualification
and citation. No-op, live revocation, unavailable engine, stalled authenticated IPC,
delayed stdin followed by stalled IPC, and unclosed stdin are independently scored.
Engine-stall controls must reach the authenticated engine to pass. Normal paths must
finish within 2,000 ms; stall controls must fail open and exit within the 3,000 ms outer
watchdog, including startup and cleanup. Behavior and latency have separate gates.

All 42 final attempts pass. Normal paths take 779–1,549 ms; stall controls take
2,270–2,753 ms and emit no context. Their internal diagnostics report 2,001–2,006 ms.
One earlier Claude Code engine-stall regression hits the outer watchdog at about
3,012 ms; its original test output remains, but temporary raw attempts were removed
by test cleanup. Its cause is not isolated. The preliminary standalone run passes
14/14 at the same default budgets. These local observations do not establish a
general scheduling or latency guarantee.

The behavioral integration regression uses 5,000 ms internally/8,000 ms externally
under parallel suite load. During the final workspace checks, its Codex positive and
no-op paths take 2,828 and 4,840 ms, exceeding the standalone two-second gate. The
[workspace test output](packages/engine/evaluation/records/2026-10-13/hook-latency-followup/workspace-tests.txt)
preserves these observations separately. Wider regression budgets do not change the
acceptance evaluator defaults or production hook settings. Native-host overhead and
semantic-model filtering remain unmeasured by this new evaluator.

All workspace builds, typechecks, website lint and 167 deterministic tests pass with
local IPC socket access; one opt-in real-model test is skipped. The refreshed production
dependency audit reports zero advisories. Existing installed dependencies were used;
`npm ci` was not repeated. Website browser/UI, native host sessions, macOS/Windows CI,
Windows startup and signed installers were not verified in this Linux run.

## October 14 startup deadline and adapter latency follow-up

The [new records](packages/engine/evaluation/records/2026-10-14/hook-latency-followup/README.md)
preserve compiled-adapter timing and verification without launching native hosts or models.
Both adapters now start their internal deadline at Node's performance time origin,
including module loading. Stdin, CLI/IPC and validation consume the same budget, and
an exhausted startup budget skips the CLI. Diagnostics include Node startup time.
Regressions cover delayed module loading in both compiled adapters and exhausted/partly
spent budgets. Synchronous work can still delay cancellation; late results are discarded
and the host's outer timeout remains necessary.

The new `npm run eval:hook-latency` records parent timing from before spawn through exit,
with the adapters' default 2,000 ms budget and a separate 3,000 ms watchdog. Three serial
repeats cover cited context, irrelevant-task silence, live credential revocation and an
unavailable engine, alternating host order. All 24 attempts pass both delivery and latency,
taking 578–662 ms. Protocol, compiled-artifact hashes, individual attempts and summary
are preserved; the runner refuses existing output directories. A regression verifies
that inherited deadline overrides cannot change the measured default and that evidence
cannot be overwritten. The initial eight-attempt probe remains archived separately.

This small synthetic workload uses lexical excerpts with all model providers disabled.
It establishes adapter-process timing on this Linux environment, excluding native-host
overhead. It does not resolve the earlier semantic applicability recall/latency failures
or establish model consumption, desktop UI or native Windows acceptance. No Ollama runtime
was available for fresh semantic trials; no model artifacts were installed or downloaded.

Clean `npm ci`, production build, workspace typechecks, website lint, production audit
and all 164 deterministic tests pass; one live-model test remains skipped. The initial
restricted-sandbox suite failed on socket/process access, while baseline and final runs
pass with the required local access. Native-host and website browser acceptance were not
repeated. CI through `7eb19f8` now passes both runners; the new local hook commits need CI.

## October 14 combined cloud verification

Merge `ca1bd93` preserves all four October 13 commits and all five October 14 commits.
The runtime combines startup-inclusive budgeting with the earlier checks after output
serialization and synchronous failure. The fresh-engine/stall evaluator remains
`npm run eval:hook-latency`; the separate October 14 actual-default baseline is now
`npm run eval:hook-default-latency`. Both original recordings and failure/load observations
remain available. Two October 13 text logs have trailing blank lines removed and their
manifest hashes refreshed; exact originals remain in `d03e8a8`, and attempt JSON is unchanged.

The [combined records](packages/engine/evaluation/records/2026-10-14/combined-hook-verification/README.md)
verify all 172 deterministic tests, build, typechecks, website lint, and zero production
dependency advisories. One opt-in live-model test remains skipped. A serial strict run
passes all 14 fresh-engine conditions at the default 2,000/3,000 ms budgets, including
authenticated IPC stalls, delayed input and unclosed stdin. The separate normal-path
runner passes all eight attempts with the adapters' actual defaults. These are direct
adapter checks with model providers disabled; native-host and semantic acceptance remain open.

The [CI run for `c410e6f`](https://github.com/TilesOS/othie-ai/actions/runs/38678642518)
passes both macOS and Windows jobs. CI for the combined history is tracked in
[PR #1](https://github.com/TilesOS/othie-ai/pull/1).

## October 18 native settings discovery follow-up

The [new native records](packages/engine/evaluation/records/2026-10-18/native-settings-followup/README.md)
preserve 24 synthetic Claude Code 2.1.283 sessions using the host's existing
`claude-opus-5-5` default on macOS. The harness now supports shared project settings,
local project settings and nested launch directories without an explicit `--settings`
fallback masking discovery. Protocols are saved before sessions and include launch
mode and compiled-artifact hashes. Positive delivery requires the full policy,
first-response/resolution qualification and citation as well as the correct native answer.

Explicit settings, shared project settings and local project settings each pass all
four conditions from the repository root: positive context, repository-only no-op,
live credential revocation and unavailable engine. Local root settings and an explicit
settings path also pass all four from a nested directory with spaces. Shared root
`.claude/settings.json` is not discovered from that nested launch: all four conditions
lack an adapter receipt, and the positive answer is `unknown`. Those failures remain
scored as failures. The setup guide now documents starting at the root for shared
settings or supplying an explicit settings path. This matches the official
[settings locations reference](https://code.claude.com/docs/en/settings).

All 20 sessions with hooks report 253–371 ms of internal adapter time. Complete native
sessions, including model responses, take 2,549–10,797 ms across all 24 attempts; these
are separate measurement boundaries and do not establish native hook process latency.
All sources and prompts are synthetic, tools/MCP are disabled, model providers inside
Othie are disabled, and no model artifacts or global hook configuration were installed.
Structured transcript redaction now removes account rate-limit metadata, session/request
identifiers and encoded memory/socket locations as well as literal host paths. Publication
hashes preserve the relationship to the original local records without changing scores,
adapter receipts or timings.

Separate serial compiled-adapter checks pass 14/14 fresh-engine conditions at the default
2,000/3,000 ms budgets, including authenticated stalls, delayed input and unclosed stdin.
The actual-default normal-path evaluator passes 8/8 in 315–442 ms. Complete fresh-engine
process time ranges from 269 to 2,037 ms; stalls use the outer watchdog gate. These run
after workspace checks without overlapping build/test work and establish only this
synthetic lexical workload on this Mac, independently of native model-session timings.

The full build, workspace typechecks, website lint, production dependency audit and all
175 deterministic tests pass, with one opt-in real-model test skipped. Installed
dependencies were used; `npm ci` was not repeated. The merged-history CI now passes on
macOS and Windows; the new local commits still need their own CI. Website browser/UI,
interactive workspace trust, Codex native sessions, semantic filtering and native Windows
acceptance were not repeated. In particular, noninteractive Claude treats the generated
workspace as trusted, so this does not close interactive or desktop acceptance.

Final harness review also found that incomplete or misspelled CLI flags could silently
select the explicit baseline. Argument parsing now rejects unknown, duplicate and
incomplete options before creating run state. Workspace typechecks and the full suite
were rerun after this guard: 176 deterministic tests pass, with the same opt-in test
skipped. The new regression covers accidental baseline selection; valid native invocation
behavior is unchanged, and the retained native sessions were not repeated for this guard.

## October 20 Codex project trust and discovery follow-up

The [new records](packages/engine/evaluation/records/2026-10-20/codex-project-followup/README.md)
preserve 20 synthetic native Codex CLI 0.156.1 sessions, including the unsuccessful
project probe and local-model result. Repeating the original project mode yields no
adapter receipt in any of four conditions. An offline `config/read` probe reports that
the project configuration layer is disabled when project trust is supplied only by a
session `-c` override. Persisting project trust in a disposable Codex home's
`config.toml` enables that layer. This distinguishes the harness's trust setup from a
failure to discover an enabled project hook.

Project mode now creates that private temporary home and omits user-config suppression
and all session hook/trust overrides. Hosted runs copy the existing file login with
private permissions; local-model runs copy no login. The original login/configuration
are not edited, and temporary state is removed in cleanup. File-backed login is required
for the hosted project mode. Hook trust still uses the one-shot bypass for the generated
hook, separately from project trust. This follows the official
[hook discovery/trust boundary](https://learn.chatgpt.com/docs/hooks).

Trusted `.codex/hooks.json` discovery passes all four conditions from the Git root and
all four from a nested directory with spaces, using the existing `gpt-6-astra` host
default. The invocation-local baseline also passes 4/4. Each positive answer is `11`,
with the complete original policy, first-response/resolution qualification and citation
in its adapter receipt. Controls verify no-op silence, live credential revocation and
engine unavailability. Native noninteractive project discovery is verified for these
launches; interactive persisted hook approval and desktop UI acceptance remain open.

The installed `qwen3.5:4b-mlx` model still answers `unknown` for positive context despite
complete cited delivery. Its three controls pass. The model digest is unchanged from
the earlier recorded identity; no model was downloaded. The temporarily started loopback
Ollama service was stopped afterward. This does not isolate whether the failure lies in
host request construction, provider handling, or model consumption. All 16 native sessions
with receipts report 249–291 ms of internal adapter time; complete native sessions take
2,020–6,638 ms across all 20 attempts. Those are separate measurement boundaries.

Both latency CLIs now share the native runner's strict argument parser: unknown,
duplicate and incomplete flags fail before run state is created. A compiled-CLI
regression checks all three runners, including a misspelled deadline option. Serial
standalone checks pass 14/14 fresh-engine conditions at 2,000/3,000 ms budgets, with
257–2,038 ms complete adapter process times, and 8/8 actual-default normal paths in
256–276 ms. These remain synthetic lexical measurements, excluding native-host overhead.

Full build, final workspace typechecks, website lint, production audit and 178 deterministic
tests pass; one opt-in real-model test is skipped. Installed dependencies were unchanged;
`npm ci` was not repeated. Publication hashes preserve redactions of host paths and
native thread/turn identifiers without changing answers, receipts, timings or scores.
Website browser/UI, fresh remote CI, semantic quality and native Windows acceptance were
not repeated. The native sessions preceded the final shared-parser refactor; valid
native flags are unchanged, and the final full suite/typechecks cover that refactor.

## October 23 local context transport and diagnostic gate follow-up

The [October 23 records](packages/engine/evaluation/records/2026-10-23/local-context-followup/README.md)
preserve three local-model native runs (including the final scorer/dependency refresh),
a hosted project-hook check, provider-boundary observations and role replays. Each local
run supplies the full cited policy in all positive adapter receipts, but answers `unknown`;
its three controls pass. Final hosted `gpt-6-astra` project-hook acceptance passes 4/4.
The installed `qwen3.5:4b-mlx` digest is unchanged; no model artifacts were downloaded.

A temporary loopback HTTP forwarder shows the complete positive adapter context in
Codex's `/v1/responses` request to Ollama 0.35.1, in a developer message after the user
query. No policy appears in the three controls. The captured request reaches the provider
intact, narrowing the October 20 failure beyond host request construction in this run.
The publication fixture removes cache/client metadata and redacts host/fixture paths;
transport hashes remain distinct from published-fixture hashes.

Three rotated replay repeats keep the redacted request and installed model defaults.
Original developer-context requests pass 0/3, as do reordered and minimal developer
variants. Changing only the hook role to system or user yields `11` in 6/6 original-host
comparisons; minimal system/user comparisons pass another 6/6. The minimal absent-policy
control passes 2/3, retaining a malformed thinking-delimiter answer. One reordered
developer request also gives a non-answer. An initial exploratory pass and four completed
attempts from a deliberately interrupted pre-redaction replay remain separate records.
These observations narrow the problem to developer-message handling in this provider/model
combination without separating provider conversion from model behavior. Role substitutions
remain evaluation-only; production hook semantics and local-model acceptance are unchanged.
Sampling, warm state and load are uncontrolled, and some final generation runs overlap.

A regression exposes that native/default-latency scorers accept content-bearing additions
to otherwise matching diagnostic events. Both now share the strict latency evaluator's
schema, rejecting unknown fields, invalid metadata and extra output. Positive scoring
requires token metadata, and the default scorer verifies the output event name. Production
adapters are unchanged. The failing old-code regression and subsequent passing checks
remain recorded.

A refreshed audit reports Next.js and Zod findings. Next.js and eslint-config-next move
from 16.3.8 to 16.4.3; Zod moves from 4.5.4 to 4.6.7. Clean `npm ci`, full build,
typechecks, website lint and 180 deterministic tests pass; one opt-in model test is skipped.
After a separate toolchain refresh, Vitest moves from 5.0.0 to 5.0.5 in all five
workspaces and its compatible Vite dependency moves from 8.2.2 to 8.3.5. Final clean
installation, build, typechecks, lint and all 180 tests pass again. Both full and
production audits report zero findings; the earlier development-only audit remains recorded.
A static website browser smoke check verifies home/demo interaction, download navigation, Windows
unavailability and setup navigation, with no browser errors/warnings. A screenshot is
retained. Responsive acceptance was not repeated.

After generation and suite work, serial strict adapter latency passes 14/14 at the actual
2,000/3,000 ms budgets in 307–2,028 ms, and actual-default normal paths pass 8/8 in
311–372 ms. These exclude native-host/model overhead. Publication hashes and a manifest
preserve privacy redactions and observed failures. Temporary model, proxy and website
services are stopped. Interactive trust, native desktop/Windows, larger benchmarks,
semantic quality, installers and fresh remote CI remain open.

## October 24–25 native coding-agent and late-query follow-up

The [native coding-agent records](packages/engine/evaluation/records/2026-10-24/native-agent-followup/README.md)
extend the earlier four-case constrained-tool benchmark to seven small JavaScript
tasks using actual Codex shell/edit tools. Each condition gets a fresh Git workspace,
disposable login home, public interface tests, and separate resource-limited behavioral
grading. Shared instructions live in `AGENTS.md`; external policy and hidden probes
are absent from the workspace. Extraction, embeddings and synthesis remain disabled.

One final repeat with requested/receipt model `gpt-6-astra` passes all 21 operational
checks. Othie and full documents each pass 7/7 tasks and 46/46 behavioral probes;
task-only passes 3/7 tasks and 31/46 probes. Task-only misses support, refund, expense
and access-extension behavior. Othie supplies every sentence of the expected policy
document in all six positive cases and injects nothing for the sorting control.
Transport, fixed-policy coverage, native completion, test-command output and workspace
integrity are checked separately. These are synthetic single-function tasks with one
repeat, not realistic multi-file acceptance or a general quality claim.

An initial three-session pilot fails support behavior under Othie despite complete
transport: keyword selection keeps only the prompt's first 20 meaningful terms and
never reaches the task's support subject. It returns brand excerpts instead. The fix
preserves every meaningful term within the profile's query-character limit and uses
balanced quoted SQLite OR expressions. Two failing old-code regressions now pass,
including a 4,000-term prefix through SQLite and both excerpt/rules-only output. A
same-input SQLite comparison recovers the support source from the unchanged original
prompt; unrelated sources can still match. All 40 existing applicability queries have
unchanged term lists. Semantic no-op/classification acceptance is not closed.

The final pilot also moves shared instructions from the user prompt to `AGENTS.md`,
so its native outcomes are not an isolated before/after test of the retrieval fix.
Both prompt versions, initial failure, restricted startup attempts, final trajectories,
objective scores and usage remain recorded. Reported cumulative input tokens are
428,517 task-only, 439,695 full-document and 438,018 Othie; cached input and output
counts are separate. Uncontrolled native turns, caching and provider state support
no causal token-saving or latency claim. No model artifacts were downloaded.

Clean installation, full build, final typechecks, website lint, 189 deterministic tests,
and both dependency audits pass. One opt-in real-model test is skipped. Hosted project
hook controls pass 4/4. After generation and suite work, serial strict adapter latency
passes 14/14 at the actual 2,000/3,000 ms budgets in 258–2,037 ms; actual-default normal
paths pass 8/8 in 260–275 ms. These adapter measurements exclude native generation/tools.
Publication hashes and the manifest are verified against retained files and compiled
artifacts. CI for the preceding `ff38e75` history now passes both runners; new local
commits still need CI. Native Windows/desktop trust and realistic multi-file work remain open.

## October 28 multi-file services and native no-op follow-up

The [multi-file records](packages/engine/evaluation/records/2026-10-28/multi-file-followup/README.md)
add a separately selected corpus of three miniature CommonJS service repositories:
support targets, refund eligibility and an array-only control. The seven-case native
pilot and constrained-tool fixtures remain unchanged. Each trajectory uses a fresh
Git workspace and disposable login home. Three editable modules implement domain
logic, ordered batch processing and a request endpoint; validators, contracts,
instructions and public tests stay protected. Recursive integrity checks reject
nested additions, protected edits, missing/oversized files and symlinks. Hidden
grading runs in a separate resource-limited process with an in-memory relative
module loader, no inherited environment and no Node filesystem/built-in imports.

Two repeats with requested/receipt model `gpt-6-astra` complete all 18 operational
sessions. Full documents pass 6/6 complete gates and 64/64 behavioral probes. Othie
passes every behavioral probe and supplies complete expected policy in all four
policy-dependent tasks, but passes only 4/6 complete gates: both array-only controls
receive unwanted refund excerpts. Task-only passes 2/6 complete gates and 45/64
probes; refund assumptions vary across repeats. Native completion, public tests,
integrity, exact receipt transport, expected-policy/no-op coverage and behavioral
results remain separate gates. The completed run exits 1 because task-only behavior
and Othie no-op checks fail.

The unchanged array task includes `Route solve(request)`. A same-engine diagnostic
finds `request` as its only shared source term and retrieves four refund excerpts
(207 XML tokens). A query-only intervention changing that identifier to `payload`
returns no excerpts; the refund-positive control still returns four. This reproduces
a lexical scope collision, not a production fix or general semantic acceptance.
The native fixtures and production term handling remain unchanged.

Reported cumulative input is 376,087 task-only, 439,310 full-document and 402,102
Othie tokens, with cached input/output separately retained. These small fixed services,
uncontrolled native turns, caching and provider state support no causal token-saving,
latency or general coding-quality claim. They add multi-file integration and repeats;
production-scale repositories, additional models and broader scope acceptance remain open.

Clean installation, full build, final typechecks, website lint, 193 deterministic tests
and both zero-finding audits pass; one opt-in model test is skipped. Hosted project
controls pass 4/4. After all native generation, serial strict adapter latency passes
14/14 at 2,000/3,000 ms budgets (261–2,037 ms), and actual-default paths pass 8/8
at 262–278 ms. Native generation/tools are outside those adapter timings. Restricted
startup/suite IPC failures, an interrupted restricted build and restricted audit DNS
errors remain recorded separately from successful reruns. Publication hashes and a
manifest verify redaction and current artifacts; the evidence verifier regrades every
saved module snapshot. Prior history through `5da7f3e` passed macOS/Windows CI at
that inspection; the October 29 inspection above additionally verifies `9f416fe`.

## October 29 query scope and recall follow-up

The [query-scope records](packages/engine/evaluation/records/2026-10-29/query-scope-followup/README.md)
compare unchanged lexical retrieval with two evaluation-only interventions: removing
`request`, and masking simple function-call argument identifiers. The 27-case corpus
keeps all three native multi-file tasks unchanged and adds paired signature/prose
controls, policy subjects expressed as code, both opposing export policies, and a
4,000-term prefix. Two fresh seeded SQLite/Lance repeats per export mode reverse case
order and rotate strategy order. Reference excerpts and manually supplied whole-document
authoritative rules isolate scope from model extraction/classification and grouping.

Both export modes have the same scores: lexical retrieval preserves 30/30 complete
positive policies but passes only 4/24 no-op checks; removing `request` scores 28/30
and 12/24; argument masking scores 22/30 and 8/24. All final citations are exact and
token counts/caps pass. Removing `request` loses the request-subject query; argument
masking loses telemetry, refund, access and both opposing export policies when their
subject appears only inside the signature. Generic prose collisions remain. The
combined gain from removing `request` cannot compensate for lost recall. Neither
intervention changes production retrieval or closes the original native no-op failures.

The 324 final results retain missing sentences/sources, additional sources, exact
evidence, XML and component timings. Positive scores require every original expected
sentence; extra positive sources are reported separately. All 40 prior applicability
queries retain identical term lists, without repeating model extraction or semantic
filtering. The initial macOS temporary-path citation mismatch is preserved and fixed
by canonicalizing the evaluator root; an end-to-end regression checks mapped exact
citations and refusal to overwrite prior evidence. A mapped intermediate run is also
retained. Each comparison exits 1 because acceptance gates remain unsatisfied.

Clean installation, full workspace build/typechecks, website lint, 198 deterministic
tests and both zero-finding dependency audits pass. One opt-in model test is skipped.
The record-local verifier checks manifests/redaction, final compiled hashes, all final
evidence/token gates, independently recomputed scores, repeat/order integrity,
intermediate results and prior CI steps. No production adapter path changed, and no
new native/model sessions or serial adapter latency measurements were run. Component
timings establish no end-to-end hook latency or host token advantage. The prior
multi-file history through `9f416fe` now passes macOS/Windows CI; the new evaluator
commits still need CI.

## Remaining acceptance work

- Codex persisted interactive hook-trust acceptance after verified noninteractive
  project-file discovery from root/nested launches; Claude
  interactive workspace trust and desktop UI acceptance beyond the recorded noninteractive
  settings discovery. Shared Claude root settings require a root launch or explicit path;
  the nested-launch discovery failure remains recorded.
- Codex local-model context consumption after the positive-context failure reproduced
  October 23 with complete cited adapter delivery and provider-boundary context. Role
  comparisons narrow the failure to developer-message handling in the installed
  provider/model combination; provider conversion versus model internals remains unresolved.
- Windows native-host and logon-startup acceptance beyond automated CI. The October 29
  inspection verifies `9f416fe`, including the multi-file native-agent and no-op
  diagnostic history, on both macOS and Windows runners. New query-scope evaluator
  commits still need CI. Native Windows host/session acceptance remains open.
- A larger benchmark using production-scale repositories, dependency changes and
  additional models. The constrained-tool baseline, seven-case native pilot and
  two-repeat miniature multi-file corpus are recorded, but support no general
  quality/token claim. Both multi-file array no-op failures remain open.
- Compiler classification, relevance, linked evidence, and packing: deterministic recovery
  removes model-selector disagreement, and the clarified prompt excludes the observed
  quoted title in fresh runs, while entitlement and assistant-permission classification
  failures are recorded and followed up. The broader boundary corpus still promotes a
  direct assistant instruction in one final repeat and fails generic-subject no-op checks.
  Standard/extended/adversarial fixtures remain fixed; long
  whole-evidence context still fails at 200 tokens. New boundary cases expose generic
  subject-word collisions even with correct classification. Controlled applicability
  trials now measure paired no-op precision and policy recall but fail acceptance.
  Native multi-file tasks also reproduce a `request` identifier/refund-policy collision;
  passing code probes does not close retrieval no-op acceptance.
  The paired query-scope corpus rejects both a global `request` exclusion and simple
  call-argument masking: each improves selected no-ops while losing required policies.
  A next scope candidate must preserve code-expressed policy subjects and opposing
  requirements while distinguishing prose uses of generic policy vocabulary.
  Source-revision overfetch recovers the three known short-query candidate gaps in the
  fixed fixtures but still fails semantic recall and latency acceptance. Next improve
  semantic scope without trading away qualifiers or opposing requirements, preserve
  separate stable-order and fresh-engine evidence, and enforce end-to-end native-hook
  latency budgets before production use. The startup-inclusive adapter-process baseline
  now passes on a synthetic lexical workload; semantic filtering and native-host overhead
  remain unaccepted. Preserve active quoted policy, genuine assistant-use policies, and all recorded failures.
  Implicit evidence links beyond syntactic qualifications, larger corpora, label entailment,
  embeddings, synthesis, semantic grading, controlled generation settings, and additional
  models remain open.
- Signed desktop installers, guided onboarding, and model artifact distribution. Native
  Windows hardware/session access, signing identities, and reviewed redistributable model
  artifacts are not available as established acceptance inputs in this run.

Post-discovery refreshes and generated navigation hints remain experimental/planned.
The structured brief keeps external facts, navigation hints, and verification checks
empty until verified producers exist. See the [host matrix](integrations/README.md) and
[engine guide](packages/engine/README.md) for the supported boundaries and setup.
