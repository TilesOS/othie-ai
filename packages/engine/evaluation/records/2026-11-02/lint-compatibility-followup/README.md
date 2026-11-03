# Lint compatibility and CI follow-up

Recorded November 2, 2026 in America/New_York (November 3 UTC), on macOS arm64
with Node.js 24.18.0. Implementation commit `17cf004` adds five tests and a CI
lint step. Website behavior, production retrieval and dependency versions are unchanged.

## Compatibility gate

The November 1 audit inspection identified legacy callable-minimatch consumers,
but normal website lint did not exercise those configured glob branches. The new
website tests run the installed ESLint configuration against virtual files:

- Next image, React key, accessibility alt-text and TypeScript explicit-any diagnostics.
- React custom-component glob matching through `react/no-danger`.
- Import exception matching through `import/no-import-module-exports`.
- Accessibility control-component matching through `jsx-a11y/label-has-associated-control`.
- Generated-output ignores and application-file inclusion.

Each plugin glob test includes a matching and a nonmatching control, so silencing
the rule cannot pass. Tests reject fatal parser errors and ignored-file warnings.
The three glob rules use test-local options, including rules not normally enabled
by the site's config. This establishes representative execution, not complete rule
coverage or complete glob equivalence. CI now runs ordinary website lint as well
as typechecks and the test suite on macOS and Windows; this new workflow change
still needs remote CI.

The [baseline probe](checks/minimatch-baseline.json) reports all three legacy
branches execute and detect the expected diagnostic. In a separate process,
[substituting minimatch 11.0.4 exports](checks/minimatch-v11.json) for those three
CommonJS cache entries makes all three throw callable-minimatch `TypeError`s.
The patched module was installed only in a disposable temporary directory. The
probe changes no module files or repository dependencies. It is an API diagnostic,
not a full npm override installation, migration, exploitability assessment or
production fix. Both the baseline's exit 0 and candidate's exit 1 are expected.

Reproduce with a new temporary candidate directory:

```sh
npm run test --workspace=@othie/website -- lib/lint-config.test.ts
node packages/engine/evaluation/records/2026-11-02/lint-compatibility-followup/probe-minimatch.mjs
npm install --prefix /tmp/othie-minimatch-new --no-audit --ignore-scripts --save-exact minimatch@11.0.4
node packages/engine/evaluation/records/2026-11-02/lint-compatibility-followup/probe-minimatch.mjs /tmp/othie-minimatch-new
```

## Audit and upstream state

The [refreshed audit](checks/audit-full.json) still reports 16 moderate development
entries from [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249);
the [production audit](checks/audit-production.json) reports zero findings.
[Registry tags](checks/minimatch-dist-tags.json) still list legacy v3 as 3.1.5.
The [newer Next ESLint config](checks/next-eslint-registry.json) retains the import,
React and accessibility consumers. Even [ESLint 10.14.0](checks/eslint-registry.json)
still declares minimatch 10.2.6, within the advisory's reported range. These
snapshots provide no compatible upstream fix; they do not exhaust every possible
toolchain migration. No major override, downgrade, suppression or lockfile change
was applied. The advisory remains open. Candidate registry integrity metadata and
installed candidate package/entry hashes are retained in checks.

## Validation and remaining work

Clean `npm ci`, full build, workspace typechecks, website lint and all 205 tests
pass; one opt-in real-model test is skipped. The suite comprises 139 engine,
30 shared-hook, 19 website, seven Claude Code and ten Codex tests. Tests ran with
local IPC access. The build-generated `next-env.d.ts` path change was restored,
then final workspace typechecks passed again. [Checks and exit codes](checks/checks.json)
retain logs. The preceding policy-guard evidence verifier also passes after rebuilding.

The [CI run for `5937f7c`](https://github.com/TilesOS/othie-ai/actions/runs/41387563741)
passes clean installation, workspace typechecks/tests and Windows startup-script
syntax on macOS and Windows. The [run/step record](ci-5937f7c.json) verifies the full
revision and both jobs. This closes the November 1 guarded-scope history's remote
CI gap, not the new lint tests/workflow change or native Windows acceptance.

The record verifier checks manifest hashes/redaction, source hashes, saved probe
outcomes, registry metadata, independently counted tests, audit totals and CI steps:

```sh
node packages/engine/evaluation/records/2026-11-02/lint-compatibility-followup/verify-evidence.mjs
```

Next evaluate a compatible plugin/toolchain migration against these execution
checks and broader glob cases before changing dependency majors. New local commits
still need CI. Semantic scope/no-op acceptance, local-model consumption, interactive
trust, native desktop/Windows sessions, larger repositories/additional models,
installers and model distribution remain open. No native/model sessions or adapter
latency probes were rerun for this lint-only change.
