# Combined hook verification

Merge `ca1bd93` retains all nine original commits from the two cloud checkouts:
October 13 ends at `d03e8a8`; October 14 ends at `c410e6f`. This follow-up verifies
the combined implementation on Linux with Node.js 24.19.0 using synthetic fixtures.

The runtime includes Node startup in the shared deadline and retains the earlier
post-serialization and synchronous-failure clock checks. Both evaluators remain:

- `npm run eval:hook-latency` uses fresh engine/index/credential state per repeat,
  seven conditions per host, and explicit 2,000 ms internal/3,000 ms outer budgets.
- `npm run eval:hook-default-latency` checks four normal conditions per host against
  one engine, omits the deadline flag and removes inherited deadline overrides.
  This is the October 14 runner previously named `hook-latency`.

The [fresh-engine summary](fresh-engine/summary.json) passes 14/14 attempts in one
serial repeat, including actual authenticated engine stalls, delayed stdin followed
by a stall, and stdin that never closes. The [default-budget summary](default-budget/summary.json)
passes 8/8 normal attempts in one serial repeat. Each attempt is preserved; behavior
and process-budget gates remain separate. These checks ran after all workspace checks,
without overlapping build/test work. They are observations of this small lexical
workload with model providers disabled, not native-host or semantic-model acceptance.

The [verification record](verification.json) and [workspace output](checks/tests.txt)
record 172 passing deterministic tests, one skipped opt-in real-model test, successful
build/typechecks/website lint and zero production dependency advisories. The combined
tests retain the earlier wider 5,000/8,000 ms regression budgets under suite load;
the standalone run uses strict defaults. The clean lockfile installation was already
performed during the October 14 work; dependencies did not change during the merge.

Both original evidence manifests verify. Two older text logs have trailing blank lines
removed and their hashes updated to satisfy whitespace checks; exact original files
remain in `d03e8a8`. Original attempt JSON, measured values and observed failures remain
unchanged. The October 13 runtime began timing after module initialization; the combined
runtime begins at Node startup, so old and new stall timings have different internal
clock boundaries. No causal or general performance claim follows from these runs.

The [manifest](manifest.json) hashes this follow-up's evidence. Current CI and the final
combined change are tracked in [PR #1](https://github.com/TilesOS/othie-ai/pull/1).
