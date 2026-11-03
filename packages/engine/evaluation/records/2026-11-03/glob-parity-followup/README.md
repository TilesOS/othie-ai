# Broader lint glob migration comparison

Recorded November 3, 2026 in America/New_York, on macOS arm64 with Node.js
24.18.0. Implementation commit `1e36331` adds 49 fixed virtual-file controls.
Production retrieval, website behavior, dependencies and the lockfile are unchanged.

## Scope and results

The [shared fixtures](../../../../../../apps/website/lib/lint-glob-fixtures.ts)
exercise six installed lint rules through the website's actual ESLint configuration:
React custom-component checks and PascalCase ignore patterns, accessibility control
components, import file exceptions, forbidden internal modules and namespace-import
ignores. Cases cover matches and nonmatches for stars, question marks, character
classes, braces, extglobs and negation; path globstars, hidden files, basename
matching, comment patterns and BMP/astral Unicode add boundary controls. The
internal-module cases execute the legacy `makeRe` API, and the PascalCase/namespace
rules supply `noglobstar`/`matchBase` options. These are migration controls, including
test-local rule options; they do not claim every rule or every glob is covered.

Each [probe](probe-globs.mjs) runs in a fresh process and replaces only the three
legacy plugins' resolved CommonJS minimatch cache exports. It loads the same fixed
fixtures as Vitest and rejects parser/configuration errors as well as diagnostic
changes. It does not edit module files or simulate npm's dependency graph.

| Condition | Passing controls | Failure |
| --- | ---: | --- |
| Installed minimatch 3.1.5 | 49/49 | None |
| Raw minimatch 11.0.4 exports | 0/49 | 43 callable-API and six `makeRe` access TypeErrors |
| Callable wrapper with v11 namespace properties | 42/49 | Six missing-`makeRe` TypeErrors and one diagnostic change |

The callable intervention forwards calls to `candidate.minimatch` and copies the
candidate's exported properties. Version 11.0.4 exports neither a top-level `makeRe`
nor `Minimatch.prototype.makeRe`, so importing the newer named function alone does
not repair `import/no-internal-modules`. Separately, `import/no-namespace` with
ignore pattern `?` reports `pkg/😀` under v3 but suppresses that diagnostic with the
callable v11 intervention. Both conditions ignore `pkg/é`; ASCII matching and
nonmatching controls also remain. Thus API callability alone does not preserve
the recorded lint behavior. No production wrapper or override is applied.

Raw exports also mark the namespace as `__esModule` without a default export;
the legacy import consumer attempts to read `default.makeRe`. The initial failure
classifier recognized only a missing callable method and missed this undefined
default error shape. The [initial classification record](checks/initial-classification.json)
retains that verifier failure and the affected rows. Extending classification to
both error shapes changes no fixture, expected diagnostic or pass/fail outcome.

The saved baseline, raw and callable reports retain every expected/observed
diagnostic, classified runtime failures and source hashes. Candidate version,
registry integrity and entry hash match the November 2 candidate record; a fresh
comparison of all 90 recorded files across its four installed packages passes.
The candidate was reused from that disposable installation, not downloaded again.
Public npm metadata still lists v3 as 3.1.5 and the latest React, import and
accessibility plugins still declare `^3.1.2`. This inspection supplies no compatible
upstream replacement and does not exhaust alternative toolchains.

## Verification and reproduction

Full workspace build, typechecks, website lint and all 254 deterministic tests pass;
one opt-in real-model test is skipped. Website tests now total 68; the other totals
remain 139 engine, 30 hooks, seven Claude Code and ten Codex. Local process tests
ran with IPC access. The build-generated `next-env.d.ts` path change was restored,
then all workspace typechecks passed again. No clean installation was repeated
because dependencies are unchanged. The November 2 evidence verifier also passes.
Logs and exit codes are retained in [checks](checks/checks.json).

The refreshed full audit retains 16 moderate development entries from
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249);
the production-only audit has zero findings. No suppression or incompatible major
override was applied. The [CI lookup](checks/ci-lookup.json) returns no runs for
the full revisions `17cf004442fa59ef7fec73b091b4282b44a00e08` and
`2fde37d0ffaf5fb270f562d0be325a3ee50b8541`; those lint changes and the new local
commits still need remote CI. Earlier CI through `5937f7c` remains recorded in the
preceding follow-up. Automated runner results do not establish native sessions.

```sh
npm run test --workspace=@othie/website -- lib/lint-glob-parity.test.ts
node packages/engine/evaluation/records/2026-11-03/glob-parity-followup/probe-globs.mjs baseline
npm install --prefix /tmp/othie-glob-candidate --no-audit --ignore-scripts --save-exact minimatch@11.0.4
node packages/engine/evaluation/records/2026-11-03/glob-parity-followup/probe-globs.mjs raw /tmp/othie-glob-candidate
node packages/engine/evaluation/records/2026-11-03/glob-parity-followup/probe-globs.mjs callable /tmp/othie-glob-candidate
node packages/engine/evaluation/records/2026-11-03/glob-parity-followup/verify-evidence.mjs
```

The raw and callable probes intentionally exit 1 because they fail the migration
gate. The verifier checks publication hashes/redaction, current source identity,
all 49 fixture judgments, both kinds of API failure, the independent behavioral
failure, candidate identity, test totals, audit results and pending CI lookups.

Next require legacy `makeRe` consumers to be migrated or replaced as well as
callable consumers, and explicitly review matching changes before any major
upgrade. A callable adapter by itself is rejected by these controls. Native
Windows/desktop/interactive trust, local-model consumption, semantic scope/no-op
acceptance, larger repositories and additional models, installers and model
distribution remain open. No native/model sessions or adapter latency probes
were rerun for this lint-only follow-up.
