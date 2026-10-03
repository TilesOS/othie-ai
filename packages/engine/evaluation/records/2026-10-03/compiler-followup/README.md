# Compiler follow-up records

Seven synthetic runs on October 3, 2026, using local macOS, Node.js 24.18.0, and the
already installed `qwen3.5:4b-mlx` artifact with digest
`61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792`.
Each directory contains a full `quality.json` report and a separate `generations.json`.
No personal documents, credentials, host paths, or model weights are included.

All runs use quality protocol `quality-v2`: six authoritative policy documents, one
adversarial reference, seven retrieval cases at 200 and 500 tokens, rules-only export,
and no embeddings or synthesis. The opposing-export case now requires an explicit
conflict flag. Earlier `quality-v1` records scored source/qualifier presence alone, so
their headline results are not the same scoring protocol.

| Stage | 200-token diagnostics | 500-token diagnostics | Rules retained |
| --- | ---: | ---: | ---: |
| [Initial sentence selection](quality-v3-spans/quality.json) | 2/7 | 7/7 | 8 |
| [Verbatim packing, run 1](quality-v3-packed-1/quality.json) | 4/7 | 7/7 | 6 |
| [Verbatim packing, run 2](quality-v3-packed-2/quality.json) | 4/7 | 7/7 | 11 |
| [Verbatim packing, run 3](quality-v3-packed-3/quality.json) | 4/7 | 5/7 | 5 |
| [Final short IDs and relevance, run 1](quality-v4-1/quality.json) | 4/7 | 7/7 | 8 |
| [Final short IDs and relevance, run 2](quality-v4-2/quality.json) | 3/7 | 7/7 | 10 |
| [Final short IDs and relevance, run 3](quality-v4-3/quality.json) | 4/7 | 7/7 | 9 |

The initial selection stage recovers rule text and quotations from numbered original
sentence spans instead of asking the model to generate both strings. The packing stage
emits matching text/quotation once as `<text verbatim="true">`, retaining the full quote
in structured citations. These stages use `rules-v3` and full chunk hashes as source IDs.

The third packing run exposed two failures worth retaining: the travel proposals all
mistyped the same long source ID, and a generated telemetry scope used "invalid," which
created a lexical match for an unrelated reference-control request. Neither failure was
caused by reference rules being promoted. The final implementation at code commit
`85ad078` uses short invocation-local source aliases (`rules-v4`) and excludes generated
scope/category labels from lexical rule matching. Original document/revision/path
provenance remains attached to the aliases. Source-evidence conflict detection at
`866a3e6` is used throughout these follow-ups.

The final three runs pass 32/42 diagnostics: 21/21 at 500 tokens and 11/21 at 200.
Both no-op controls pass in all final runs. Every final opposing-export result includes
the conflict warning; at 200 tokens the opposing side is omitted, so that case still
fails source/qualifier coverage. Other tight-budget omissions vary with model-selected
grouping and generated label length. All final runs complete with exact retained
citations, unchanged artifact identity, no reference rules promoted, and valid token
accounting/caps. Every report still has `passed: false`; broad quality acceptance remains
open.

These are fresh extractions of one fixed small corpus with one model. Generation options
are not seeded, temporary revision IDs differ, and stages change both extraction and
packing behavior. The table is descriptive, not a controlled attribution of gains to
one change, independent statistical evidence, or semantic entailment validation.
Generated category/scope labels still need review. It does not establish native-host,
Windows, desktop UI, synthesis, or embedding acceptance. Artifact redistribution license
and notice review remains pending; no weights were downloaded or redistributed.

To reproduce a new final run with the installed artifact:

```sh
npm run eval:quality -- --model qwen3.5:4b-mlx --out /tmp/othie-quality-new-run
```

The output directory must be new. The CLI exits nonzero for any failing diagnostic and
preserves the report; a nonzero quality result is expected while 200-token coverage is
incomplete.
