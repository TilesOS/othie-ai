# Installed parser minimatch reachability

Recorded November 7, 2026 in America/New_York, on macOS arm64 with Node.js
24.18.0. Commit `688ba6b` adds four regression tests and a fresh-process probe.
Repository dependencies, lockfile and production retrieval are unchanged.

## Observed call path

The [advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) describes pattern
amplification during minimatch preprocessing at `optimizationLevel >= 2`.
The [installed dependency resolution](checks/consumers.json) identifies estree
8.70.0 as the only direct consumer of affected minimatch 10.2.6 in this lockfile;
the six other direct consumers resolve legacy 3.1.5. This inventory covers declared
package dependencies, not arbitrary dynamic imports or vendored copies.

The [probe](../../../../../../apps/website/lib/lint-parser-reachability-probe.mjs)
observes named matcher calls and the installed `Minimatch` preprocessing methods.
Wrappers forward unchanged arguments and results in an isolated process. It
publishes synthetic patterns/options, phase counts, judgments and source hashes,
without file paths or raw parser errors. The [final trace](checks/reachability.json)
records these results:

| Condition | Observation |
| --- | --- |
| Current website config, virtual TSX and JS files | No project/project-service setting, no lint errors and zero affected matcher/preprocessing calls |
| All 30 existing project-service fixtures | Original outcomes preserved, including verified `number` types for admitted files; 26 matcher calls with exactly `{ dot: true }` |
| Preprocessing for those 26 calls | Effective optimization level 1; zero calls to either level-two phase |
| Three globstar/parent-pattern parser controls | `invalid-pattern`, before any matcher or preprocessing call |
| Fixed direct matcher, omitted level and explicit level 1 | One pattern remains; neither level-two phase runs |
| Same direct matcher, explicit level 2 | Both phases run once and expand one pattern into two |

The direct positive control uses only `root/**/../nested/file.ts`; it is not a
resource-exhaustion experiment. A subprocess deadline bounds regression execution.
The initial control used `**/../*.ts`, which entered both phases but did not have
the two trailing components required to expand a pattern. Its incorrect expansion
assertion failed. The [initial trace](checks/initial-reachability.json) and
[failed focused test](checks/initial-focused-test.txt) remain recorded; the final
control corrects that fixture without changing the parser corpus or production.

Two independent guards are observed: the consumer uses minimatch's level-one
default, and estree rejects patterns containing `**` before matching. The current
website config does not enable that project-service branch. These observations
do **not** establish universal non-exploitability, clear the package advisory or
justify suppressing the audit. They apply to the installed CJS consumer, checked
configuration and fixed fixtures; different consumers, options or future package
versions need a new review. The tests intentionally fail if these observations drift.

## Audit, upstream and CI

The fresh [full audit](checks/audit-full.json) retains eight moderate development
entries; the [production audit](checks/audit-production.json) has zero findings.
The [v10 release list](checks/minimatch-v10-releases.json) still ends at 10.2.6,
[latest minimatch](checks/minimatch-tags.json) is 11.0.5, and
[latest estree metadata](checks/estree-registry.json) is 8.72.1 with `^10.2.2`.
No compatible upstream fix was identified. The November 6 major-version probe's
two Unicode admission changes remain a rejected migration, and no override or
suppression was added.

The [run for `21f590e`](https://github.com/TilesOS/othie-ai/actions/runs/42167019665)
is cancelled overall. Its Windows job passes clean installation, typechecks,
website lint, tests and startup-script syntax; its macOS job is cancelled with
no recorded steps. The [full-revision run/job record](checks/ci-21f590e.json)
therefore establishes Windows CI for the November 6 parser-control history,
but does not establish macOS CI for it or any CI for the new reachability controls.
The Composio CLI returned Unauthorized during read-only tool discovery, so these
CI reads used the existing GitHub CLI connection. No remote jobs were restarted.

## Verification

Full workspace build, typechecks, website lint and all 288 deterministic tests
pass; one opt-in real-model test is skipped. Counts are 139 engine, 30 shared
hooks, 102 website, seven Claude Code and ten Codex. Build and process tests ran
with local process/IPC access. The build-generated `next-env.d.ts` path changes
were restored, then typechecks and lint passed again. No clean installation was
repeated because dependencies are unchanged. The November 6 evidence verifier
also passes. [Check results](checks/checks.json) and sanitized logs are retained.

```sh
npm run test --workspace=@othie/website -- lib/lint-parser-reachability.test.ts
node apps/website/lib/lint-parser-reachability-probe.mjs
node packages/engine/evaluation/records/2026-11-07/parser-reachability-followup/verify-evidence.mjs
```

The record verifier checks publication integrity, source identities, preserved
fixture outcomes, actual branch observations, the corrected positive control,
dependency resolution, audits, test totals and partial CI. No native/model sessions,
semantic scope experiments, installer/signing work or model downloads were run.
The remaining retrieval-scope work should preserve the original 27 cases and
18 policy-guard counterexamples, with separate positive/no-op and subset scores.
The reachability result supplies no evidence about semantic retrieval quality or
end-to-end hook latency.
