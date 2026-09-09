# Baseline models

The defaults are benchmark baselines, not quality-optimality claims.

| Operation | Configured identity | Upstream license reviewed | Source |
| --- | --- | --- | --- |
| Embeddings | `ollama:nomic-embed-text:configured`, 768 dimensions | Apache License 2.0 | [Ollama model record](https://ollama.com/library/nomic-embed-text) |
| Extraction and synthesis | `ollama:qwen3:4b:configured`, thinking disabled | Apache License 2.0 | [Qwen/Qwen3-4B model card](https://huggingface.co/Qwen/Qwen3-4B) |

`configured` is a deployment-supplied revision label. Production operators should replace it with the exact Ollama artifact digest/revision they deploy and preserve the associated license and notice files. Othie includes provider, model, revision, dimensions, and preprocessing identity in derived-data and cache invalidation boundaries; it never combines vector tables across identities.

Model license review is not legal advice and must be repeated when a model or artifact revision changes.
