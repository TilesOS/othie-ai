# Othie

A local context engine for AI assistants, built as a personal engineering project.

Othie watches a folder of documents (Markdown, text, PDF, DOCX), extracts rules with
citations, and gives AI tools a short, token-bounded summary of what applies to the current
task. Tools reach it through the [Model Context Protocol](https://modelcontextprotocol.io)
(MCP). Indexing runs locally, and keyword search works without any model installed.

I built it to learn how retrieval, context packing, and agent tool integration behave
under real constraints: crash safety, strict token budgets, provenance, and privacy
boundaries. It is not a commercial product.

## How it works

```text
documents ──► watcher ──► parser ──► durable job queue ──► rule extraction (local LLM)
                                                              │
MCP client ◄── stdio bridge ◄── engine ◄── retrieval + packing ◄─┘
                                           (keyword FTS, optional vectors)
```

- **Ingestion.** A Chokidar watcher, startup scans, and periodic reconciliation feed a
  SQLite job queue with retry backoff. Revisions are staged and published atomically, so a
  crash never exposes a half-indexed document. When a file is deleted or access is lost,
  its rules become ineligible right away.
- **Extraction.** A local model (Ollama, Qwen3 4B by default) proposes rules. Each rule is
  checked against an exact quotation from its source before it is kept. Authoritative
  sources are kept separate from reference material, and conflicts are reported instead of
  silently resolved.
- **Retrieval.** SQLite FTS and LanceDB handle keyword search, with optional vector search.
  Vector tables are versioned by model identity. If embedding fails, the engine falls back
  to keyword search.
- **Packing.** Selection is deterministic. Output is XML-escaped and counted with the
  exact tokenizer, and it stays under a hard budget (500 tokens by default), including
  citations and status.
- **Delivery.** One engine process owns all writes. Lightweight stdio bridges authenticate
  to it with per-client credentials over a local socket or named pipe. An opt-in
  [Codex hook prototype](integrations/codex/README.md) injects context at the start of a
  turn and returns nothing if the engine is slow or unavailable.

## Early evaluation

The engine includes a small synthetic benchmark. Six generated documents and four tasks are
answered by the same local model (`qwen3.5:4b-mlx`) under three conditions, with Othie
capped at 200 tokens:

| Condition | Correct (3 runs) | Answer input tokens (4 tasks) |
| --- | ---: | ---: |
| Task only | 1/4 each run | n/a |
| All documents in prompt | 3/4 each run | 2,376 |
| Othie context | 4/4 each run | ~1,000 |

The fourth task was a control that shouldn't need outside context, and Othie correctly
returned nothing for it. This fixture set is far too small to support a general claim. It
is a smoke test that shaped the next step: a benchmark of real, tool-using coding-agent
tasks. The methodology is in the [evaluation guide](packages/engine/evaluation/README.md).

## Repository layout

```text
packages/engine/     Indexing, extraction, retrieval, CLI, and MCP bridge (TypeScript)
integrations/codex/  Opt-in turn-start context hook prototype
apps/website/        Project landing page (Next.js)
apps/desktop/        Startup templates for macOS LaunchAgent and Windows scheduled task
models/              Model catalog placeholder
```

## Running it

Requires Node.js 24. [Ollama](https://ollama.com) is optional and enables semantic search
and rule extraction.

```sh
npm install
npm run build
npm test            # deterministic suite, no model downloads
npm run test:mcp    # two real MCP clients and bridges against one engine, including a restart

npm run engine -- init --config config.json
npm run dev:engine -- --config config.json
```

The [engine guide](packages/engine/README.md) covers MCP host setup, credentials,
configuration, the CLI, and privacy boundaries. Baseline model choices and their licenses
are in [MODELS.md](MODELS.md), and the security model is in [SECURITY.md](SECURITY.md).

## Status and scope

This is a working single-user baseline for macOS (Apple Silicon) and Windows x64. Out of
scope for now: OCR, a review UI, multi-user identity or policy, and guaranteed automatic
retrieval in MCP hosts. With plain MCP, the host decides whether to call the tool. Local
processing also doesn't make the whole pipeline private: a host may send Othie's output to
a cloud model.
