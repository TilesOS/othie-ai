# Othie Context Delivery — Fresh-Chat Implementation Handoff

Prepared September 11, 2026. This handoff is intended to be pasted into or linked from a fresh coding chat. It scopes the first three days of the [context delivery roadmap](context-delivery-roadmap.md).

## Fresh-chat prompt

Work in `/Users/tylermcclure/Documents/othie-ai` and implement the first vertical slice of Othie's context-delivery architecture. Read this entire handoff, `docs/context-delivery-roadmap.md`, `packages/engine/README.md`, `docs/verification.md`, and the relevant engine source/tests before editing.

Othie is becoming a context compiler and delivery layer for existing agents. Do not build a new agent or replace the host's repository exploration. Preserve the engine's current profile isolation, permitted-export rules, revocation checks, citations, whole-item packing, token budgets, deterministic fallback, and old MCP tool behavior.

The requested outcome is:

1. extend context requests with optional surface/phase/host/workspace signals;
2. return a versioned structured context brief alongside the existing XML text;
3. prototype a Codex `UserPromptSubmit` adapter that asks the local engine for turn-start coding context and injects it only when useful;
4. add tests and documentation proving backward compatibility, safe failure, and no-op behavior.

Use current official OpenAI documentation for the exact Codex hook contract and installation shape. Do not invent a hook configuration based on this handoff if the current docs differ. Keep the prototype in the repository; do not modify the user's global Codex configuration or install it into the home directory unless separately asked.

## Starting state

The repository is an npm workspace using Node.js 24 and TypeScript ESM.

Relevant files:

- `packages/engine/src/types.ts`: current `ContextRequest`, `ContextStatus`, and `ContextResult`.
- `packages/engine/src/mcp/bridge.ts`: MCP input schema and text-only response.
- `packages/engine/src/engine/ipc.ts`: context IPC request type.
- `packages/engine/src/engine/service.ts`: forwards context requests to the compiler.
- `packages/engine/src/context/compiler.ts`: retrieval, rule selection, optional synthesis, cache, and final revalidation.
- `packages/engine/src/context/packing.ts`: XML rendering, citations, conflict status, and token budgeting.
- `packages/engine/test/mcp.integration.test.ts`: compiled stdio bridge coverage.
- `packages/engine/test/rules-budget.test.ts`: packing and token-budget tests.
- `packages/engine/test/stabilization.test.ts`: retrieval/rule/failure behavior.
- `packages/contracts`: reserved shared-contract workspace, currently with no runtime API.

Current request shape:

```ts
interface ContextRequest {
  query: string;
  profile?: string;
  max_tokens?: number;
  synthesize?: boolean;
}
```

Current MCP behavior returns:

```ts
{ content: [{ type: "text", text: result.text }] }
```

The XML text is an existing compatibility contract. Do not remove it.

## Scope and sequence

### Step 1: lock the contract in tests

Before changing runtime code, add focused tests that express:

- a legacy request containing only `query` still works;
- valid optional `surface`, `phase`, `host`, `workspace_root`, and `active_paths` fields reach the engine;
- unknown enum values, empty path entries, excessive list lengths, and unreasonable field lengths are rejected at the MCP boundary;
- the MCP result contains the existing text content and a versioned `structuredContent` object;
- structured status agrees with the XML/result status for mode, tokens, omitted items, availability, and revision counters;
- an empty retrieval result is represented explicitly rather than fabricated;
- adapter metadata does not affect credential/profile authorization.

Choose conservative bounds and name them as constants so they can be reviewed. Reuse the existing profile `max_query_chars` enforcement for the query itself.

### Step 2: add optional request metadata

Add these concepts without breaking current callers:

```ts
type ContextSurface = "code" | "chat" | "work" | "unknown";
type ContextPhase = "turn_start" | "on_demand" | "post_discovery";

interface ContextRequestMetadata {
  schema_version?: "1";
  surface?: ContextSurface;
  phase?: ContextPhase;
  host?: string;
  workspace_root?: string;
  active_paths?: string[];
}
```

Keep `query`, `profile`, `max_tokens`, and `synthesize` unchanged. Normalize missing values internally to `surface: "unknown"` and `phase: "on_demand"` where a complete response needs them.

Do not use `workspace_root`, `active_paths`, or `host` as authorization signals. In this first slice they are relevance/provenance metadata only. Include metadata that changes compiler behavior in the compiler cache key; otherwise requests with different routing meaning could share stale candidates. If a field does not yet change candidate construction, document that fact and avoid needless cache fragmentation.

Do not activate `packages/contracts` merely to hold one consumer's types. The existing repository rule says engine types stay in the engine until there is a second real consumer. Reassess this after the Codex adapter shape is known. If the adapter imports the contract as a distinct package, then promoting the browser-safe schema to `@othie/contracts` is justified; add explicit build/typecheck scripts and a workspace dependency in that case.

### Step 3: add a minimal ContextBriefV1

Return a structured envelope derived from data the engine already verifies. Do not manufacture external facts, navigation hints, or checks before a safe producer exists.

Minimum recommended result:

```ts
interface ContextBriefV1 {
  schema_version: "1";
  request: {
    surface: ContextSurface;
    phase: ContextPhase;
    host?: string;
  };
  context_text: string;
  applicable_rules: Array<{
    id: string;
    text: string;
    category: string;
    scope: string;
    authority: number;
    citation: { source: string; at: string; quote?: string };
  }>;
  permitted_excerpts: Array<{
    id: string;
    text: string;
    citation: { source: string; at: string };
  }>;
  synthesis?: {
    text: string;
    citations: Array<{ source: string; at: string }>;
  };
  external_facts: [];
  navigation_hints: [];
  verification_checks: [];
  conflicts: Array<{ rule_ids: string[]; detection: "explicit_opposition_only" }>;
  status: ContextStatus;
}
```

This is a proposed shape, not permission to weaken token budgeting or duplicate unlimited source text. Refine it where the implementation reveals a cleaner contract. In particular:

- citation paths must use the same safe source labeling as the XML response;
- rules/excerpts included in structured output must be exactly the eligible, packed selection, not every retrieval candidate;
- do not expose raw absolute source paths when the current text contract would label them relative to a configured source;
- do not include omitted source contents outside the requested budget;
- quote evidence only when permitted and already part of the packed item;
- make empty sections explicit arrays;
- keep conflict detection labeled as limited rather than implying a complete logical analysis.

If producing a trustworthy structured rule list requires refactoring `packContext`, refactor it so one selected-item representation renders both XML and structured output. Do not parse the generated XML back into objects.

Add `structuredContent` in the MCP bridge while preserving text content:

```ts
return {
  content: [{ type: "text", text: result.text }],
  structuredContent: result.brief,
};
```

Confirm the installed MCP SDK's exact return type and current structured-content support before coding. Use the official MCP specification and installed package types as the source of truth.

### Step 4: build one repository-contained Codex hook prototype

After the contract and MCP integration are green, add a small prototype under a clearly named integration directory such as `integrations/codex/`. Use the exact current Codex `UserPromptSubmit` hook input/output contract from official OpenAI documentation.

Required behavior:

- accept the hook event on stdin;
- extract only the fields documented by Codex;
- build a request with `surface: "code"`, `phase: "turn_start"`, and `host: "codex"`;
- call the local Othie engine through an existing authenticated boundary rather than bypassing profile grants;
- use a modest configurable token cap;
- emit additional developer context only when the result contains useful items;
- preserve citations and label navigation hints advisory if/when they exist;
- return successfully and emit no context when Othie is unavailable, times out, returns empty, or returns invalid data;
- write diagnostics to stderr only, without prompts, source content, context text, credentials, or secrets;
- have a short configurable deadline and never leave the coding task blocked indefinitely.

Prefer reusing the local IPC client only if doing so preserves the same bridge credential checks and does not duplicate secret-handling logic. Calling the compiled MCP bridge as a subprocess may be simpler but could add startup cost. Measure the prototype before choosing a permanent transport.

Repository artifacts should include:

- hook source;
- a build or execution path consistent with the workspace;
- fixture-driven tests for relevant, empty, invalid, unavailable, and timed-out responses;
- an example hook configuration using repository-relative placeholders;
- setup notes that explain where a user would install it, without editing global state automatically.

Do not implement Claude Code in this slice. Do not install or modify global host configuration.

### Step 5: documentation and verification

Update the engine guide and verification document with:

- the distinction between MCP tool access and automatic hook delivery;
- the new optional request fields;
- the structured/text dual response;
- prototype setup and removal;
- the privacy boundary: the host may send injected context to its cloud model;
- the hook's deadline and fail-open behavior;
- a dated local verification result only for checks actually run.

Run from the repository root:

```sh
npm run build
npm run typecheck
npm test
npm run test:mcp
```

Also run the hook tests directly if they are not part of the root suite. Perform one manual fixture check if a local Codex hook runtime is available, but do not claim manual host verification when only unit tests ran.

Finish with `git diff --check` and review the diff for accidental secret, absolute personal-source, or unrelated-file changes.

## Acceptance criteria

The slice is complete only when all of the following are true:

- existing callers require no new arguments;
- existing XML text remains available and retains its token/citation guarantees;
- structured output contains only packed, eligible material;
- all structured claims have bounded evidence/citation information;
- surface and path metadata cannot widen access;
- the Codex adapter inserts context for a positive fixture and stays silent for a negative fixture;
- engine unavailability or adapter timeout does not block the host prompt;
- diagnostics avoid content and secrets;
- automated build, typecheck, full test, and MCP test commands pass;
- docs distinguish implemented, prototype, and planned behavior accurately.

## Non-goals

Do not add any of the following during this slice:

- a generic task-classification model;
- external web search or SaaS connectors;
- hard codebase file filtering;
- Claude Code, ChatGPT hosted-chat, or cowork adapters;
- model fine-tuning;
- end-to-end benchmark infrastructure beyond fixtures needed for the slice;
- telemetry upload or a cloud service;
- a desktop setup UI;
- public plugin packaging or submission;
- speculative fields populated with generated assertions.

## Likely pitfalls

- **Returning all retrieved candidates in structured output.** This bypasses final packing and can leak revoked, over-budget, or unauthorized content. Build both formats from the same final selection.
- **Treating the workspace path as a permission.** It is only a hint. Credential grants and configured profiles remain authoritative.
- **Breaking the cache.** Include behaviorally relevant request dimensions, or make explicit that a field is presentation-only.
- **Duplicating status values.** Generate XML and structured output from one result so token and conflict counts agree.
- **Parsing XML to recover structure.** Refactor the packer's intermediate representation instead.
- **Blocking prompt submission.** The adapter needs a strict deadline and a safe no-op path.
- **Logging sensitive payloads.** Tests should assert that simulated failures do not print prompts or returned context.
- **Assuming plugin installation deploys local hooks.** Treat the repository prototype, local runtime setup, and hosted plugin distribution separately.
- **Claiming broad host support.** This slice proves only the tested MCP behavior and the Codex prototype.

## Suggested commit boundaries

Keep the work reviewable even if it is delivered in one branch:

1. tests and optional request metadata;
2. structured context brief and MCP compatibility;
3. Codex hook prototype and its tests;
4. setup/verification documentation.

Do not commit unless the user asks. Preserve unrelated user changes and report any overlap before editing those files.

## What comes immediately after

Once this slice is green, the next task should implement the same adapter contract for Claude Code and create the first small end-to-end A/B harness described in the roadmap. The benchmark, not intuition, should decide whether post-discovery refreshes and navigation hints deserve further investment.
