# Model metadata

`manifest.json` is an empty catalog placeholder, not an active engine configuration or download feed.
The engine still reads its model settings from the user's config. No custom model artifact is released here.

Before connecting this catalog to installers, define and validate the shared schema in
`packages/contracts`, including immutable artifact URLs, checksums, license, size, runtime
compatibility, and hardware requirements. An empty catalog must offer no model download.
Keep weights, training datasets, and checkpoints out of this repository. Model development
will use a separate repository; see [model notes](../MODELS.md) for the current baseline.
