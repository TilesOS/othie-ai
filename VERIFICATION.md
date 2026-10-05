# Othie verification

Updated October 5, 2026 on macOS with Node.js 24.18.0. The deterministic suite uses
synthetic documents and provider fixtures; it requires no model training or downloads.

## Checks run

| Check | Result |
| --- | --- |
| `npm run build` | All workspaces pass; Next.js 16.3.8 exports the website routes |
| `npm run typecheck` | All workspaces pass |
| `npm test` | 128 passing tests; one opt-in real-model test skipped |
| MCP/lifecycle/cross-host tests within `npm test` | Six process tests pass |
| `npm run lint --workspace=@othie/website` | Pass |
| Local compiler-quality evaluator, final coverage follow-up | Standard: 42/42 diagnostics and complete fixture coverage; extended: 19/26 each repeat, with non-policy promotion and long-evidence budget failures |
| `git diff --check` | Pass |
| `npm audit --omit=dev` | Zero reported production dependency advisories |

The full suite comprises 74 engine, 23 shared-hook, 14 website, 10 Codex, and seven
Claude Code tests. Process tests require access to local Unix sockets or Windows named
pipes; they were run with local socket access outside the restricted command sandbox.

The [GitHub Actions run for code commit 504c27f](https://github.com/TilesOS/othie-ai/actions/runs/37093664926)
also passes on `macos-14` and `windows-latest`: clean `npm ci`, all workspace typechecks,
the then-current 93 tests, and the Windows startup-script syntax check. A pre-existing
Windows fixture used `URL.pathname` to launch a local CLI; it now uses `fileURLToPath`.
The [GitHub Actions run for commit 19a9dfe](https://github.com/TilesOS/othie-ai/actions/runs/37260102983)
also passes on both runners with the then-current 118 deterministic tests, typechecks,
clean installation, and Windows startup-script syntax check. This verifies the previous
October 3–4 changes on Windows. The newer coverage/relevance changes through `41df142`
have local macOS verification only. Those automated runner results do not establish
native desktop-host or logon-startup acceptance.

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

## Remaining acceptance work

- Codex project-file discovery and persisted interactive hook-trust acceptance; Claude
  project/local settings discovery and desktop UI acceptance beyond explicit CLI settings.
- Codex local-model context consumption after the observed positive-context failure.
- Windows native-host and logon-startup acceptance beyond the historical automated CI
  suite; the new changes also need current Windows CI verification.
- A larger benchmark using native host coding tools and realistic fixed tasks; the first
  constrained-tool baseline is recorded, but supports no general quality/token claim.
- Compiler semantic classification and selection completeness: explicit dispositions
  prevent unaccounted sentences, but can label policy as descriptive or promote model
  instructions and non-policy facts. Final standard repeats pass; every extended repeat
  still fails classification/no-op checks and long whole-evidence packing at 200 tokens.
  Larger corpora must evaluate source lengths, rule grouping, and linked evidence. Label
  entailment, embeddings, synthesis, semantic grading, and comparisons across models remain open.
- Signed desktop installers, guided onboarding, and model artifact distribution. Native
  Windows hardware/session access, signing identities, and reviewed redistributable model
  artifacts are not available as established acceptance inputs in this run.

Post-discovery refreshes and generated navigation hints remain experimental/planned.
The structured brief keeps external facts, navigation hints, and verification checks
empty until verified producers exist. See the [host matrix](integrations/README.md) and
[engine guide](packages/engine/README.md) for the supported boundaries and setup.
