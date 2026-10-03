# Othie verification

Recorded October 2, 2026 on macOS with Node.js 24.18.0. The deterministic suite uses
synthetic documents and provider fixtures; it requires no model training or downloads.

## Checks run

| Check | Result |
| --- | --- |
| `npm run build` | All workspaces pass; Next.js 16.3.8 exports the website routes |
| `npm run typecheck` | All workspaces pass |
| `npm test` | 93 passing tests; one existing real-model quality TODO |
| `npm run test:mcp` | Six MCP/lifecycle/cross-host process tests pass |
| `npm run lint --workspace=@othie/website` | Pass |
| `git diff --check` | Pass |
| `npm audit --omit=dev` | Zero reported production dependency advisories |

The full suite comprises 39 engine, 23 shared-hook, 14 website, 10 Codex, and seven
Claude Code tests. Process tests require access to local Unix sockets or Windows named
pipes; they were run with local socket access outside the restricted command sandbox.

The [GitHub Actions run for code commit 504c27f](https://github.com/TilesOS/othie-ai/actions/runs/37093664926)
also passes on `macos-14` and `windows-latest`: clean `npm ci`, all workspace typechecks,
all 93 tests, and the Windows startup-script syntax check. A pre-existing Windows fixture
used `URL.pathname` to launch a local CLI; it now uses `fileURLToPath`. These automated
runner results do not establish native desktop-host or logon-startup acceptance.

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

Next.js and its ESLint configuration were updated together from 16.3.4 to 16.3.8;
transitive brace-expansion dependencies were updated within their existing version
ranges. The production build exports home, download, pricing, privacy, and developer
setup pages. The agent-browser check loaded the home page, followed the download link,
selected the Windows target, and followed developer setup at a 390 × 844 viewport.
Desktop/mobile screenshots were inspected. Home and download checks found no framework
error overlay or horizontal overflow; browser error reports remained empty through setup.
Installer availability still fails closed.

Five development-tool audit findings remain in the ESLint/fast-glob/micromatch/braces
chain. The current audit offers a downgrade to an older Next.js ESLint configuration,
so that incompatible change was not applied. These are separate from the clean production
dependency audit.

## Remaining acceptance work

- Native Codex and Claude Code hook sessions, with host versions and delivery transcripts.
- Windows native-host and logon-startup acceptance beyond the passing automated CI suite.
- A tool-using coding-agent benchmark with fixed tasks, full-document and bounded-context
  conditions, preserved transcripts, objective scoring, and explicit no-op controls.
- Model quality evaluation beyond the existing small synthetic smoke comparison.
- Signed desktop installers, guided onboarding, and model artifact distribution.

Post-discovery refreshes and generated navigation hints remain experimental/planned.
The structured brief keeps external facts, navigation hints, and verification checks
empty until verified producers exist. See the [host matrix](integrations/README.md) and
[engine guide](packages/engine/README.md) for the supported boundaries and setup.
