# Local context transport and acceptance follow-up

Recorded October 23, 2026 on macOS arm64, Node.js 24.18.0, Codex CLI 0.156.1
and Ollama 0.35.1. All native sessions use isolated synthetic documents, lexical
excerpt fallback, and a live Othie engine. No model artifacts were downloaded or
redistributed. Code changes are `9e61e99` (diagnostic gates), `cf8f09b` (production
dependencies), and `b750070` (development toolchain).

## Native delivery and provider transport

| Run | Model | Delivery | Delivery plus native answer |
| --- | --- | --- | --- |
| [Initial local reproduction](local-baseline/summary.json) | `qwen3.5:4b-mlx` | 4/4 | 3/4 |
| [Captured local reproduction](local-captured/summary.json) | Same installed model | 4/4 | 3/4 |
| [Final local acceptance](local-final/summary.json) | Same installed model | 4/4 | 3/4 |
| [Final hosted project acceptance](hosted-project/summary.json) | `gpt-6-astra` | 4/4 | 4/4 |

Every local positive answer remains `unknown`, although the adapter supplies the
complete cited canary policy, including the first-response/resolution qualification.
Repository-only, revoked-credential and unavailable-engine controls pass. The final
local and hosted runs use the strict diagnostic gate and patched production dependencies.
The earlier two local runs use the preceding compiled harness. No interactive hook
approval, native desktop UI or Windows session was tested.

The [transport trace](transport-trace.json) records request-body hashes and content
presence at the loopback provider boundary. A temporary forwarder listened on
127.0.0.1:11434 and forwarded bodies unchanged to Ollama on 127.0.0.1:11436.
The positive `/v1/responses` request contains the complete adapter context in a
`developer` message after the user query. All three controls contain no canary
policy. This rules out loss before that provider request in the captured run;
it does not establish what the model receives after provider conversion/tokenization.

The [fixed provider request](provider-request.json) retains instructions, messages,
tools and generation options. Cache/client metadata is removed and host/fixture
paths are replaced. Its published hash is separate from the original transport-body
hash. It is an inspection/replay fixture, not a production provider configuration.

## Role comparisons

An [initial exploratory pass](exploratory-replay.json) replays the original captured
body in eight forms. The subsequent [three rotated repeats](role-replays/summary.json)
use the fixed redacted request. They keep captured generation options and installed
model defaults, without temperature/seed overrides. Original/reordered requests
preserve the complete host context; minimal requests keep only the policy and query,
replace the host instructions, and remove tools.

| Replay form | Exact expected answers across three final repeats |
| --- | --- |
| Original request, developer hook context | 0/3 (`unknown` each time) |
| Developer hook context moved before other messages | 0/3 (two `unknown`; one non-answer) |
| Only hook message role changed to system | 3/3 (`11`) |
| Only hook message role changed to user | 3/3 (`11`) |
| Minimal developer policy plus query | 0/3 (`unknown`) |
| Minimal system policy plus query | 3/3 (`11`) |
| Minimal user policy plus query | 3/3 (`11`) |
| Minimal query without policy | 2/3 (`unknown`; one malformed thinking delimiter output) |

The pattern narrows the failure to developer-message handling in this provider/model
combination. It does not isolate provider conversion from the model's own behavior.
The absent-context control's malformed answer and the reordered developer non-answer
remain failures; answers are not normalized to hide them. Sampling, warm state and
machine load are uncontrolled. The final local native run overlaps part of the last
replay repeat; these generation timings support no latency comparison or causal claim.

An [interrupted preliminary replay](interrupted-replay/protocol.json) retains its four
completed attempts. It was stopped to finish path redaction before recording the final
fixture hash. It has no summary and is excluded from the three final repeats.
The final [model identity](checks/model-identity.json) preserves digest
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`, matching October 20.
The model was unloaded and temporary Ollama, forwarding and website services stopped.

Role changes remain evaluation-only. The native hook protocol intentionally uses
additional developer context, as described in the official [Codex hook guide](https://learn.chatgpt.com/docs/hooks).
No production role rewrite or model-consumption acceptance is claimed.

Reproduce the fixed comparisons against the already installed model:

```sh
OLLAMA_HOST=127.0.0.1:11436 ollama serve
# In another terminal, from this directory; choose a fresh output directory:
node replay.mjs --out /tmp/othie-role-replay-new
```

The [runner](replay.mjs) checks the installed digest before and after, refuses to
reuse the destination, hashes each transformed request and raw response, saves every
attempt immediately, and retains model text/usage without response identifiers.
Successful runner completion means the diagnostic experiment finished, not that
original developer-message consumption passed. No API key or hosted login is used.

## Diagnostic gates and dependency maintenance

The native and actual-default scorers previously accepted unexpected diagnostic
fields as long as host and outcome matched. The [new regression](checks/diagnostics-regression.txt)
fails on that prior behavior. Both now use the strict latency evaluator's shared
allowlist, rejecting content-bearing additions, invalid field types/enums, excessive
token counts and appended output. Positive acceptance also requires token metadata;
the default scorer now verifies the `UserPromptSubmit` output event. Raw failures
remain recorded; production adapter behavior is unchanged.

The [fresh production audit](checks/production-audit-before.json) reports critical
Next.js and high Zod findings. Next.js and its ESLint configuration move together
from 16.3.8 to 16.4.3; Zod moves from 4.5.4 to 4.6.7. Relevant advisories include
[image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[Server Actions denial of service](https://github.com/advisories/GHSA-p3m5-59mp-jv5r),
[typed-array cache deserialization](https://github.com/advisories/GHSA-673q-mjm6-r5xr), and
[Zod collection validation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
The static website exports with unoptimized images; the audit finding alone does
not establish application exploitability. The existing Sharp override already meets
the image advisory's workaround. The updates resolve the reported package findings.

[Clean installation](checks/clean-install.txt), [build](checks/build.txt),
[typechecks](checks/typecheck.txt), [website lint](checks/website-lint.txt), and
[180 deterministic tests](checks/final-tests.txt) pass after the updates; one opt-in
real-model test is skipped. Engine: 119; hooks: 30; website: 14; Codex: 10; Claude: 7.
The [intermediate full audit](checks/full-audit-before.json) then identifies three
remaining development-tool findings, including the [Vitest mocker advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8).
Vitest moves from 5.0.0 to 5.0.5 in all five workspaces; Vite moves from 8.2.2 to
8.3.5 within its existing compatible range. The final clean install, build, typechecks,
lint and all 180 tests pass again. Both the [full audit](checks/full-audit.json) and
[production audit](checks/production-audit.json) now report zero findings. The
[resolved dependency tree](checks/dependencies.json) records the installed versions.
No forced downgrade or production API change was used.
The [restricted test attempt](checks/restricted-tests.txt) preserves local-socket
permission failures; the [permitted initial suite](checks/initial-tests.txt) passes.

After generation and the full suite finish, serial [strict adapter latency](strict-latency/summary.json)
passes 14/14 at the real 2,000/3,000 ms budgets, including stalls; process times are
307–2,028 ms. [Actual-default latency](default-latency/summary.json) passes 8/8 at
311–372 ms. These are synthetic complete-adapter-process measurements, excluding
native host and model overhead.

A [desktop browser smoke check](checks/browser-smoke.json) loads the patched static
export, changes the context demo, follows Download, selects Windows and follows
Developer setup. No browser errors/warnings are recorded. The
[download screenshot](checks/website-windows.png) shows installer availability still
fails closed. Responsive/UI redesign, native installers and fresh remote CI were not
verified. The final compiled adapter, CLI and shared runtime hashes match the preceding native
and serial latency runs after the development-only refresh; see [verification metadata](verification.json).
The published [hash manifest](manifest.json) covers all evidence files;
[publication hashes](publication.json) distinguish local originals from redacted copies.
