# Othie AI

**Othie** is the product; **Othie AI** is the company and website brand.

Othie is a single-user background engine for macOS (Apple Silicon) and Windows x64. It watches configured documents, keeps durable local revisions, retries unfinished provider work, extracts cited rules from authoritative sources, and returns a bounded `<organization_context>` block through MCP.

Othie supplies context; the MCP host decides whether and how to call the tool and use its result. V1 does not promise automatic retrieval or system-prompt insertion. Processing can be local while consumption is not: a host may send Othie's returned text to its cloud model.

## What this build includes

- Node.js 24 TypeScript ESM and the stable MCP v2 `@modelcontextprotocol/server` and `@modelcontextprotocol/client` packages.
- One writer engine with an OS-user local socket/named pipe, credential-bound profile grants, two stdio MCP tools, and restart-tolerant bridges.
- Startup scan, Chokidar watching, periodic reconciliation, a durable SQLite job queue, stable reads, retry backoff, and atomic revision publication.
- Markdown/text, text PDF (PDF.js), and DOCX (Mammoth) parsing. OCR, encrypted PDFs, oversized files, and malformed inputs are reported but not guessed at.
- SQLite manifests/rules/job state and offline FTS; LanceDB text FTS and model-versioned vector tables. Query embedding failure falls back to keyword retrieval.
- Structured Ollama/OpenAI-compatible provider adapters, exact-quotation validation, authority/reference separation, provenance, and unresolved conflict reporting.
- Deterministic whole-item packing, XML escaping, exact configured-tokenizer counting, an explicit minimum envelope, a 500-token default, optional two-second synthesis, LRU caching, and in-flight coalescing.

This is a reliable local-operation baseline, not an enterprise qualification. Central identity, centrally enforced policy, fleet management, compliance certification, application-managed encryption, OCR, Linux/Windows ARM, a review UI, and guaranteed host hooks are outside v1.

## Quick start

Requirements: Node.js 24 LTS and, for semantic/extraction features, Ollama.

```sh
npm install
npm run build
cp config.example.json config.json
ollama pull nomic-embed-text
ollama pull qwen3:4b
node dist/src/cli.js credential create --config config.json --bridge claude --profiles company --default-profile company --out .othie/bridge-claude.credential
node dist/src/cli.js engine foreground --config config.json
```

The engine indexes and serves keyword results even if Ollama is absent. A model/provider failure never enables another provider. The sample remote adapter is configured but no sample profile authorizes it.

For Ollama local-only mode, set `OLLAMA_NO_CLOUD=1` or set `"disable_ollama_cloud": true` in Ollama's `server.json`, then restart Ollama and verify its log reports cloud disabled. A loopback URL by itself is not proof that all inference is local.

## Configuration and credentials

`config.json` is versioned and validated with Zod. Source roots carry two independent numbers:

- `authority_priority` expresses policy precedence.
- `retrieval_weight` affects search ranking only; it never establishes precedence.

The engine resolves real paths before admission, rejects symlink/junction escapes, excludes hidden/state/generated/credential-like paths by default, and only accepts `.md`, `.markdown`, `.txt`, `.pdf`, and `.docx`. Put source-specific roots in most-specific-first order.

Bridge secrets are not stored in `config.json`. `credential create` stores a SHA-256 verifier in the protected state directory and writes the random credential to the requested mode-0600 file. A same-user malicious process is outside this isolation boundary. Rely on OS account permissions and enable FileVault or BitLocker for data at rest.

Remote endpoints must use HTTPS unless they are loopback. Redirects are rejected; configure the final approved endpoint. Credentials are read from named environment variables, including `OPENAI_API_KEY`, never from Othie configuration. Authorize a remote provider separately for each profile operation (`embeddings`, `extraction`, `synthesis`).

## MCP host setup

Every host launches a lightweight stdio bridge. Use absolute paths in actual host configuration:

```json
{
  "mcpServers": {
    "othie": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/Othie AI/dist/src/mcp/bridge.js"],
      "env": {
        "OTHIE_CONFIG": "/absolute/path/to/Othie AI/config.json",
        "OTHIE_BRIDGE_ID": "claude",
        "OTHIE_BRIDGE_CREDENTIAL_FILE": "/absolute/path/to/Othie AI/.othie/bridge-claude.credential"
      }
    }
  }
}
```

Create a separate credential/grant for Claude Desktop, Cursor, and VS Code. Their MCP configuration shapes and tool-calling behavior change independently; verify each host using its current documentation. The exposed tools are:

- `get_organization_context({ query, profile?, max_tokens?, synthesize? })`
- `get_context_status({})`

`synthesize` defaults to false. A request cap can lower, never raise, an enabled profile cap. When the profile cap is disabled, an explicit request cap still applies. The token guarantee covers all returned XML, citations, and status under `o200k_base` or `cl100k_base`; host framing and unsupported host tokenizers are identified as estimates and are outside the guarantee.

## CLI

```text
othie init --config config.json
othie engine foreground --config config.json
othie credential create --config config.json --bridge NAME --profiles p1,p2 [--default-profile p1] [--admin] --out FILE
othie status --config config.json --bridge NAME --credential-file FILE
othie query --config config.json --bridge NAME --credential-file FILE --query "..." [--profile NAME] [--max-tokens 200] [--synthesize]
othie rebuild --config config.json --bridge ADMIN --credential-file FILE
othie purge --config config.json --bridge ADMIN --credential-file FILE
```

Purge removes Othie's active and historical SQLite/Lance-derived state. It cannot erase filesystem backups or promise secure physical erasure.

## Background startup

- macOS: edit the placeholders in `packaging/macos/com.othieai.engine.plist`, copy it to `~/Library/LaunchAgents/`, and load it with `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.othieai.engine.plist`.
- Windows: from PowerShell, run `packaging/windows/install-task.ps1 -NodePath ... -CliPath ... -ConfigPath ...`. It creates a per-user logon task; no administrator account is requested.

Foreground mode is recommended during initial host verification. Only the engine owns watchers and database writes; bridges contain no indexing logic.

## Verification

```sh
npm run typecheck
npm test
npm run test:mcp
RUN_OTHIE_MODEL_TESTS=1 npm run test:models
npm run benchmark
```

The deterministic suite requires no model downloads. `test:mcp` uses two real SDK clients and two stdio bridge processes against one engine, then restarts the engine. Real-model quality and latency work is deliberately separate. `evaluation/retrieval.jsonl` labels relevance, unsupported claims, lost qualifiers, reference-only evidence, adversarial text, and contradictions. Baseline model identities and reviewed upstream licenses are recorded in `MODELS.md`; deployments should replace placeholder revisions with exact artifact digests.

Benchmark output records hardware/model identity, cold startup, warm queries, memory snapshot, and fallback frequency. Record results separately on actual Apple Silicon and Windows x64 hardware; the two-second setting is a synthesis deadline including queue wait, not an end-to-end performance promise.

Operational logs belong on stderr and must contain status/latency metadata only—not prompts or document contents.

## Design notes

SQLite's active revision is the publication authority. New records are staged under an inactive revision; every lookup joins against the current manifest revision. A detected replacement clears active eligibility before parsing, so a crash cannot expose a partially published revision. Deletion, exclusion, or access loss revokes eligibility and rules immediately.

LanceDB maintains an explicit full-text index and separate vector tables keyed by provider/model revision/dimensions. SQLite FTS is an intentional lexical safety net. Reciprocal-rank fusion combines available text/vector ranks, then applies retrieval weights. Authority is retained separately and contradictions are emitted rather than silently merged.

Document text is untrusted data. Structured output, source-ID validation, exact quotation matching, and XML escaping reduce specific failure modes; none is a general prompt-injection defense.

## Primary references

- [MCP tools specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP TypeScript SDK v2](https://github.com/modelcontextprotocol/typescript-sdk)
- [LanceDB full-text search](https://docs.lancedb.com/search/full-text-search)
- [Node IPC](https://nodejs.org/api/net.html#ipc-support)
- [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer)
- [Ollama local-only configuration](https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features)

## Stabilization and release gates

See [MVP verification](docs/verification.md) for regression coverage, database upgrade
behavior, Windows CI, and the native-host acceptance procedure. The current conflict
check recognizes explicit opposing modalities for the same scoped action; it does not
interpret every difference between two policies as a contradiction.

Use `othie host-config --host claude|cursor|vscode --config config.json --bridge NAME
--credential-file FILE` to print host-specific configuration. This command does not
modify host settings or include the secret in its output. Excerpts are packed as complete
sentence units with following qualifications attached; rules are always kept whole.

## Updating an existing development setup

The product is now Othie, from Othie AI. Commands are `othie` and `othie-mcp`,
and MCP configuration uses the `othie` server key and `OTHIE_*` environment variables.
Rebuild and regenerate host configuration with `host-config`, replacing the old
server entry. Stop the previous engine and bridge processes before restarting.

New sample configurations store state in `.othie/`; platform defaults are
`~/Library/Application Support/Othie` on macOS and `%LOCALAPPDATA%\Othie` on Windows.
Existing state and credentials are not automatically moved or deleted. To retain
an existing index, keep `data_dir` and `credentials_file` set to their previous
explicit paths (including `.kith/` or the old `KithAI` application-data directory),
and use the existing bridge credential file when regenerating host configuration.
Both old and new hidden state folders remain excluded from indexing and Git.

If you installed background startup, unload the old `com.kithai.engine` LaunchAgent
or unregister the `Kith AI Context Engine` scheduled task before installing the
renamed template. Repository folder names are independent of the brand; generated
host configuration resolves the actual checkout path.
