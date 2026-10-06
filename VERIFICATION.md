# Othie verification

Updated October 5, 2026 on macOS with Node.js 24.18.0. The deterministic suite uses
synthetic documents and provider fixtures; it requires no model training or downloads.

## Checks run

| Check | Result |
| --- | --- |
| `npm ci` | Clean lockfile installation passes |
| `npm run build` | All workspaces pass; Next.js 16.3.8 exports the website routes |
| `npm run typecheck` | All workspaces pass |
| `npm test` | 143 passing tests; one opt-in real-model test skipped |
| MCP/lifecycle/cross-host tests within `npm test` | Six process tests pass |
| `npm run lint --workspace=@othie/website` | Pass |
| Local compiler-quality evaluator, deterministic follow-up | Final: standard 42/42; extended 75/78; adversarial 123/126; boundaries 153/168 with one instruction-promotion coverage failure and two no-op failures |
| `git diff --check` | Pass |
| `npm audit --omit=dev` | Zero reported production dependency advisories |

The full suite comprises 89 engine, 23 shared-hook, 14 website, 10 Codex, and seven
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
inspected during the present follow-up and verifies the preceding coverage, relevance,
and classification commits. New local changes beginning with `a36f3fc` still need their
own Windows CI. Automated runner results do not establish native desktop-host or
logon-startup acceptance.

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
and lint were rerun October 4; browser/UI acceptance was not repeated for engine-only edits.

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

## Remaining acceptance work

- Codex project-file discovery and persisted interactive hook-trust acceptance; Claude
  project/local settings discovery and desktop UI acceptance beyond explicit CLI settings.
- Codex local-model context consumption after the observed positive-context failure.
- Windows native-host and logon-startup acceptance beyond the historical automated CI
  suite; CI through `61279ff` passes both runners, and the new deterministic-selection
  changes still need current Windows CI verification.
- A larger benchmark using native host coding tools and realistic fixed tasks; the first
  constrained-tool baseline is recorded, but supports no general quality/token claim.
- Compiler classification, relevance, linked evidence, and packing: deterministic recovery
  removes model-selector disagreement, and the clarified prompt excludes the observed
  quoted title in fresh runs, while entitlement and assistant-permission classification
  failures are recorded and followed up. The broader boundary corpus still promotes a
  direct assistant instruction in one final repeat and fails generic-subject no-op checks.
  Standard/extended/adversarial fixtures remain fixed; long
  whole-evidence context still fails at 200 tokens. New boundary cases expose generic
  subject-word collisions even with correct classification. Next evaluate semantic or
  structurally grounded applicability with both no-op precision and policy recall checks;
  preserve active quoted policy, genuine assistant-use policies, and all recorded failures.
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
