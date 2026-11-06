# Parser glob migration and revised advisory scope

Recorded November 6, 2026 in America/New_York, on macOS arm64 with Node.js
24.18.0. Commit `f29f1af` adds 30 TypeScript parser controls. Repository
dependencies, lockfile, website behavior and production retrieval are unchanged.

The [public advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), updated
November 4, now specifies `>=7.0.0 <11.0.1`, rather than the previously recorded
`<11.0.1`. The fresh [full audit](checks/audit-full.json) reports eight moderate
development entries from that one advisory, down from sixteen; the
[production audit](checks/audit-production.json) still reports zero findings.
This reduction comes from revised advisory metadata, not a dependency fix or
suppression. Earlier audit and migration failures remain historical evidence.

The [installed tree](checks/minimatch-tree.json) still contains affected
minimatch 10.2.6 under `@typescript-eslint/typescript-estree` 8.70.0. Legacy
ESLint/React/import/accessibility consumers use 3.1.5, now outside the advisory's
range. A global major override remains incompatible and is unnecessary to
address this revised advisory. Latest estree metadata (8.72.1) still declares
`^10.2.2`; no compatible upstream release was identified in this inspection.

## Actual parser controls

The [shared cases](../../../../../../apps/website/lib/lint-parser-fixtures.ts)
run through the installed parser's actual project service, which calls named
`minimatch` with `{ dot: true }` for `allowDefaultProject`. Every case creates an
isolated synthetic TypeScript project and clears parser caches before/after use.
Accepted files must produce a program whose type checker identifies the fixture
variable as `number`; exclusions must produce the expected project-service error.
Tests also check overly broad glob rejection and files included by both a
configured project and the default-project allowlist. These exercise a branch
that ordinary website lint does not enable, without changing the site's config.

| Fresh-process condition | Parser controls | Legacy plugin controls |
| --- | ---: | ---: |
| Installed dependencies | 30/30 | 49/49 |
| Parser-only raw minimatch 11.0.5 replacement | 28/30 | Not changed by this intervention |
| Three legacy consumers replaced with raw 11.0.5 | Not changed by this intervention | 0/49 |
| Three legacy consumers replaced with callable 11.0.5 wrapper | Not changed by this intervention | 42/49 |

The [parser-only intervention](probe-parser.mjs) encounters no named-API failure,
but reverses two filename judgments. With `?.ts`, `😀.ts` changes from excluded to
accepted. With `??.ts`, it changes from accepted to excluded. Both accepted
conditions return a typed program. ASCII, BMP, combining-character, dotfile,
brace, extglob, negation, nested-path and project-conflict controls retain their
judgments. This is both a widening and a narrowing of default-project admission,
so a parser-only major override fails the plan's behavior-preservation gate.
No repository override or shim was applied. Future migration needs an explicit
decision about Unicode admission semantics or a compatible upstream fix.

Repeating the preceding plugin probe against 11.0.5 retains all earlier failure
classes: raw exports cause 43 callable and six `makeRe` access failures; the
callable intervention retains six `makeRe` failures and the independent astral
Unicode namespace-import diagnostic change. These isolated cache interventions
are compatibility diagnostics, not an installed dependency-graph migration,
exhaustive glob proof or vulnerability exploitability assessment.

Candidate registry integrity, entry identity, and hashes for all installed files
in its four public packages are retained in [checks](checks/candidate-packages.json).
The candidate was freshly installed in a temporary directory with audit uploads
and lifecycle scripts disabled. Parser and plugin probes each run once per
condition in separate processes. Reports contain fixed error classifications,
not host paths or raw parser error messages.

## Verification and CI

Full build, workspace typechecks, website lint and 284 deterministic tests pass;
one opt-in real-model test is skipped. Counts are 139 engine, 30 hooks, 98 website,
seven Claude Code and ten Codex. The restricted Next.js build stopped producing
output and was interrupted (exit 130); the subsequent build with local process
access passes. The build-generated `next-env.d.ts` path change was restored and
workspace typechecks pass again. Process tests ran with local IPC access. No clean
install was repeated because repository dependencies are unchanged. The preceding
November 3 evidence verifier passes. Logs and observed exit codes are preserved.

The [CI run for c7ea37d](https://github.com/TilesOS/othie-ai/actions/runs/41584677601)
passes on macOS and Windows, including clean installation, workspace typechecks,
website lint, tests and the Windows startup-script syntax step. The
[run/job record](checks/ci-c7ea37d.json) retains full revision identities and step
results. This closes the November 2–3 lint/workflow history's remote CI gap.
New parser-control and evidence commits still need CI. Automated runner results
do not establish native Windows/session acceptance.

```sh
npm run test --workspace=@othie/website -- lib/lint-parser-glob.test.ts
node packages/engine/evaluation/records/2026-11-06/parser-glob-followup/probe-parser.mjs baseline
npm install --prefix /tmp/othie-parser-candidate --no-audit --ignore-scripts --save-exact minimatch@11.0.5
node packages/engine/evaluation/records/2026-11-06/parser-glob-followup/probe-parser.mjs candidate /tmp/othie-parser-candidate
node packages/engine/evaluation/records/2026-11-06/parser-glob-followup/verify-evidence.mjs
```

The candidate parser probe intentionally exits 1 on its two failed controls.
The November 3 `probe-globs.mjs` accepts the same temporary candidate directory
for the `raw` and `callable` plugin interventions, also intentionally exiting 1.
The verifier checks publication integrity/redaction, source identity, all parser
judgments and plugin failures, candidate identity, audits, test totals and CI steps.
No native/model sessions, adapter latency probes, semantic scope experiments,
installer/signing work or model downloads were performed. Those acceptance items
remain open as described in `VERIFICATION.md`.
