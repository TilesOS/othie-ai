# Othie verification

Updated October 3, 2026 on macOS with Node.js 24.18.0. The deterministic suite uses
synthetic documents and provider fixtures; it requires no model training or downloads.

## Checks run

| Check | Result |
| --- | --- |
| `npm run build` | All workspaces pass; Next.js 16.3.8 exports the website routes |
| `npm run typecheck` | All workspaces pass |
| `npm test` | 102 passing tests; one opt-in real-model test skipped |
| `npm run test:mcp` | Six MCP/lifecycle/cross-host process tests pass |
| `npm run lint --workspace=@othie/website` | Pass |
| `RUN_OTHIE_MODEL_TESTS=1 npm run test:models` | Operational/safety checks pass; source/qualifier diagnostics 7/14, quality acceptance fails |
| `git diff --check` | Pass |
| `npm audit --omit=dev` | Zero reported production dependency advisories |

The full suite comprises 48 engine, 23 shared-hook, 14 website, 10 Codex, and seven
Claude Code tests. Process tests require access to local Unix sockets or Windows named
pipes; they were run with local socket access outside the restricted command sandbox.

The [GitHub Actions run for code commit 504c27f](https://github.com/TilesOS/othie-ai/actions/runs/37093664926)
also passes on `macos-14` and `windows-latest`: clean `npm ci`, all workspace typechecks,
the then-current 93 tests, and the Windows startup-script syntax check. A pre-existing
Windows fixture used `URL.pathname` to launch a local CLI; it now uses `fileURLToPath`.
The new October 3 changes have local macOS verification only; that historical CI run
does not verify these changes on Windows. Those automated runner results do not establish
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
and lint were rerun October 3; browser/UI acceptance was not repeated for engine-only edits.

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

## Remaining acceptance work

- Codex project-file discovery and persisted interactive hook-trust acceptance; Claude
  project/local settings discovery and desktop UI acceptance beyond explicit CLI settings.
- Codex local-model context consumption after the observed positive-context failure.
- Windows native-host and logon-startup acceptance beyond the historical automated CI
  suite; the new changes also need current Windows CI verification.
- A larger benchmark using native host coding tools and realistic fixed tasks; the first
  constrained-tool baseline is recorded, but supports no general quality/token claim.
- Compiler quality improvements for omitted qualifiers, exact quotation generation, and
  conflict categorization; embeddings, synthesis, semantic entailment, and repeated
  model comparisons remain unevaluated by the new corpus.
- Signed desktop installers, guided onboarding, and model artifact distribution. Native
  Windows hardware/session access, signing identities, and reviewed redistributable model
  artifacts are not available as established acceptance inputs in this run.

Post-discovery refreshes and generated navigation hints remain experimental/planned.
The structured brief keeps external facts, navigation hints, and verification checks
empty until verified producers exist. See the [host matrix](integrations/README.md) and
[engine guide](packages/engine/README.md) for the supported boundaries and setup.
