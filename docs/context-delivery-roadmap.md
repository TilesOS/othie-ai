# Othie Context Delivery Product and Engineering Roadmap

Prepared September 11, 2026. This document defines the recommended direction for turning the existing Othie engine and a future Othie model into a differentiated context layer for AI applications. It covers the next several months; the companion [near-term implementation handoff](near-term-context-delivery-handoff.md) scopes the first few days of work.

## Executive decision

Othie should become a **context compiler and delivery layer for existing AI agents**, not another general-purpose chat or coding agent.

The product should take the context a host agent cannot reliably discover by scanning the current workspace, then compile the smallest trustworthy brief that helps that agent make a better decision. Depending on the task, that context may include:

- organizational policies and operating rules;
- a user's durable preferences and conventions;
- exceptions, approvals, and authority relationships;
- current external facts and product documentation;
- relevant prior decisions;
- suggested codebase locations and verification requirements.

The host agent should continue to inspect live code, use its own tools, make changes, and verify the result. Othie should improve that work by supplying evidence-backed context before or during the task.

The first product wedge should be coding agents. Coding provides clear integration points, objective evaluation, and measurable costs. Chat and general work modes should use the same engine and response contract through different delivery adapters.

The core product claim to prove is:

> For tasks whose important constraints are not fully discoverable in the active workspace or conversation, Othie improves correctness and policy compliance while adding less context than pasting entire source documents.

Do not claim this publicly until the benchmark demonstrates it.

## Why this is different from normal agent behavior

A strong coding agent already searches a repository, reads relevant files, follows imports, runs tests, and revises its plan. Othie does not add much value by duplicating that exploration.

The gap is the information that is absent, hard to locate, stale, or scattered across boundaries:

- an internal standard that is not stored in the repository;
- a customer's special requirement recorded elsewhere;
- an exception to the default policy;
- a recently changed external API requirement;
- a user's preference that should carry across tools;
- a required review, test, or release procedure;
- conflicting instructions whose authority must remain visible.

This makes Othie's role narrower and more defensible:

1. Determine whether this turn needs extra context.
2. Retrieve from the sources the user has authorized.
3. Preserve evidence, authority, scope, exceptions, and conflicts.
4. Compress the result to a declared budget.
5. Deliver it in the form best suited to the active surface.
6. Stay out of the way when nothing useful is found.

The ideal Othie response is often short. A clean no-op is a successful result when the available context would not improve the task.

## Product vocabulary

These terms should remain distinct in product copy and architecture discussions.

| Term | Meaning for Othie |
| --- | --- |
| **Engine** | The local service that indexes allowed sources, retrieves evidence, compiles a bounded response, and enforces profile/export policy. |
| **Compiler model** | A task-specific model that decides what is applicable and compresses it without losing evidence, scope, negations, exceptions, or conflicts. |
| **MCP server** | The interoperable protocol endpoint that exposes Othie tools and structured results to compatible clients. |
| **Connector** | A managed integration to an external system, often exposed through MCP. A connector is a source or capability, not Othie's product identity. |
| **Plugin** | An installable bundle that may contain skills/instructions, MCP configuration, hooks, UI, and other integration assets. A plugin is a distribution package. |
| **Adapter** | Othie code and configuration for a particular host/surface/event, such as a Codex prompt hook or an explicit ChatGPT tool. |
| **Context brief** | The versioned, evidence-backed artifact Othie returns for one task phase. |

MCP remains the correct interoperability layer, but an MCP tool alone does not guarantee that a host will call Othie before every prompt. Plugins, skills, hooks, and explicit tool invocation are delivery mechanisms around the engine.

## Current repository truth

The current engine is a strong base rather than a finished delivery product.

- [`packages/engine/src/mcp/bridge.ts`](../packages/engine/src/mcp/bridge.ts) exposes `get_organization_context` and `get_context_status` through MCP.
- [`packages/engine/src/types.ts`](../packages/engine/src/types.ts) accepts `query`, `profile`, `max_tokens`, and `synthesize`; it does not yet model surface, task phase, host, or active paths.
- [`packages/engine/src/context/compiler.ts`](../packages/engine/src/context/compiler.ts) performs hybrid retrieval, rule selection, optional cited synthesis, and deterministic fallback.
- [`packages/engine/src/context/packing.ts`](../packages/engine/src/context/packing.ts) preserves whole items, citations, explicit conflicts, and a token budget in an XML response.
- [`packages/engine/evaluation/retrieval.jsonl`](../packages/engine/evaluation/retrieval.jsonl) contains five useful seed cases, but it is not an end-to-end agent benchmark.
- [`packages/engine/test/model.quality.test.ts`](../packages/engine/test/model.quality.test.ts) is still a placeholder for real-model quality evaluation.
- [`packages/contracts`](../packages/contracts) is intentionally reserved until a shared runtime contract has a real second consumer.

The existing bridge accurately states that the host decides how to use returned context. That behavior must remain true for tool-only integrations. Automatic prompt delivery requires a host-supported hook or an equivalent trusted runtime integration.

## Target architecture

```text
host adapter
  declares surface, host, task phase, budget, and available workspace signals
        |
        v
Othie request router
  validates trust boundary, classifies the task, rewrites retrieval queries,
  decides whether retrieval is worthwhile, and sets the context budget
        |
        v
retrieval and policy layer
  lexical + semantic retrieval + authority + freshness + profile/export scope
        |
        v
Othie compiler model
  selects, reconciles without hiding conflicts, compresses, and cites
        |
        v
versioned ContextBrief
  rules + external facts + navigation hints + checks + conflicts + evidence
        |
        v
host agent
  investigates live state, acts, and verifies
```

There are two important separations in this architecture.

First, **retrieval eligibility is deterministic**. The model cannot grant itself access to another profile, export forbidden excerpts, revive a revoked source, or create citations that do not exist.

Second, **navigation is advisory**. Othie may recommend files, folders, symbols, and search terms, but the coding agent remains free to inspect other code. Hard filtering can hide indirect dependencies, tests, configuration, generated code, and security boundaries. It may be evaluated as an experiment, but it should not become the default product behavior without unusually strong evidence.

## Surface and phase detection

Othie should not infer the entire operating mode from prompt text if an adapter already knows it. Use the following precedence:

1. The adapter supplies an explicit `surface` and `phase`.
2. A bridge credential identifies the configured host and its allowed capabilities.
3. The engine classifies the task within that declared surface.
4. Prompt-only surface inference is a fallback and returns a confidence score.

MCP client metadata can help identify software, but it is not a reliable standard for distinguishing a chat turn from coding or cowork activity. Host identity and surface identity are related but separate. A Codex adapter can explicitly declare `code`, while a generic MCP client may remain `unknown` unless the caller supplies a valid value.

Recommended initial types:

```ts
type ContextSurface = "code" | "chat" | "work" | "unknown";
type ContextPhase = "turn_start" | "on_demand" | "post_discovery";

interface ContextRequestV1 {
  schema_version: "1";
  query: string;
  profile?: string;
  max_tokens?: number;
  synthesize?: boolean;
  surface?: ContextSurface;
  phase?: ContextPhase;
  host?: string;
  workspace_root?: string;
  active_paths?: string[];
}
```

All new fields should initially be optional so existing CLI, MCP, and host configurations keep working. Treat adapter metadata as untrusted input for retrieval relevance; never let it expand profile authorization or export policy.

## The ContextBrief contract

The engine needs a stable structured result that hosts can render or adapt without parsing prose. The XML/text response should remain available as a compatibility fallback.

Recommended shape:

```ts
interface ContextBriefV1 {
  schema_version: "1";
  request: {
    surface: ContextSurface;
    phase: ContextPhase;
    host?: string;
    task_summary: string;
    confidence: number;
  };
  applicable_rules: ContextItem[];
  permitted_excerpts: ContextItem[];
  synthesis?: ContextItem;
  external_facts: ContextItem[];
  navigation_hints: NavigationHint[];
  verification_checks: VerificationCheck[];
  conflicts: ContextConflict[];
  status: {
    mode: "deterministic" | "synthesized" | "fallback" | "empty";
    token_count: number;
    omitted_items: number;
    keyword_available: boolean;
    vector_available: boolean;
    corpus_revision: number;
    rule_revision: number;
  };
}
```

Every claim-like item should carry an ID, source label, source location, evidence text or an evidence reference, authority, and freshness when available. Navigation hints should carry a reason and confidence and be labeled advisory. Verification checks should state the expected check, not pretend it already passed.

The first implementation does not need to populate every section richly. It does need a stable, tested envelope, explicit empty arrays, and a compatibility path that accurately represents the existing engine result.

## Delivery strategy by surface

### Coding agents

The best first integration is a prompt-start hook in a trusted local runtime. Current Codex and Claude Code hook systems support prompt-submit events that can add context before the agent begins the task. The adapter should:

1. receive the user prompt and declared workspace root;
2. create a `surface: "code"`, `phase: "turn_start"` request;
3. call the local Othie engine under a host-scoped credential;
4. emit a small context brief as additional developer context;
5. emit nothing when Othie has no useful context or cannot respond within the deadline.

The brief should prioritize:

- applicable organization/project rules that may be outside the repository;
- current external facts or documentation tied to the task;
- advisory directories, files, symbols, and search terms;
- required tests, security checks, review steps, or release gates;
- unresolved conflicts and the evidence for each side.

A later `post_discovery` call may use the agent's early search results or active paths to refine context. Do not run Othie on every low-level file read or tool call in the first release. That would create latency, prompt churn, and hard-to-debug behavior.

### Chat

Hosted chat environments may not provide a local pre-prompt hook. Use the strongest available mechanism in this order:

1. an installed plugin/skill that teaches the model when to call Othie;
2. a model-selected Othie MCP tool;
3. an explicit user mention or `@Othie`-style invocation;
4. a client integration built on the API.

Chat output should be readable natural language backed by structured citations. It should focus on durable preferences, organization facts, relevant external information, and conflicts. Code-navigation hints should appear only when the chat task actually involves a repository.

### Work or cowork tasks

General work tasks benefit from a task brief rather than a collection of snippets. Prefer:

- goal and definition of done;
- organizational constraints;
- authoritative and permitted sources;
- deliverable conventions;
- relevant decisions and unresolved conflicts;
- approval or review checkpoints;
- freshness and source status.

Refresh the brief after material task changes, compaction, or explicit on-demand requests. Avoid re-injecting an unchanged brief on every turn.

## Roadmap

### Days 1–3: contract and one vertical slice

Deliverables:

- versioned `ContextRequest` additions for surface, phase, host, workspace root, and active paths;
- a versioned structured `ContextBrief` envelope derived from the existing safe result;
- MCP `structuredContent` plus the current XML/text content for backward compatibility;
- one Codex `UserPromptSubmit` adapter prototype with a strict latency/failure policy;
- unit and integration tests for legacy callers, structured output, invalid metadata, empty output, and no-op hook behavior;
- a small example configuration and threat-boundary documentation.

Exit criteria:

- all existing tests remain green;
- old clients can call `get_organization_context` unchanged;
- a supported MCP client can read both text and structured output;
- a local Codex prompt receives cited Othie context when relevant and no injected text when irrelevant;
- adapter metadata cannot widen the credential's profile grants or export policy.

The detailed implementation instructions are in [the fresh-chat handoff](near-term-context-delivery-handoff.md).

### Days 4–7: second host and observable behavior

Deliverables:

- a Claude Code adapter using the same request and response contract;
- a host compatibility matrix that records supported delivery mechanism, installed location, hook behavior, and fallback behavior;
- a `post_discovery` experiment using active paths or initial search results;
- privacy-preserving local telemetry for surface, phase, timing, token count, item count, no-op reason, fallback mode, and anonymous outcome labels;
- user-facing diagnostic output that excludes source contents and secrets;
- updated setup and verification docs.

Exit criteria:

- the same fixture task behaves consistently in Codex and Claude Code;
- hook timeouts fail open, allowing the host task to proceed;
- logs contain no document text, user prompt text, raw credentials, or model secrets by default;
- disabling the adapter returns the host to its original behavior cleanly.

### Week 2: prove the product with an end-to-end benchmark

Build a task harness with four paired conditions:

| Variant | Description | Question it answers |
| --- | --- | --- |
| A | Normal host agent with repository access | What does the agent already do without Othie? |
| B | Same agent with full relevant documents pasted | Is more context itself enough, and at what cost? |
| C | Othie rules and external facts only | Does compiled external context improve the result? |
| D | Othie context plus advisory navigation hints | Do hints improve speed or accuracy beyond context alone? |

Include tasks where the key requirement is intentionally absent from the repository. Otherwise a capable coding agent may solve the task from the workspace and Othie's distinct value will be impossible to measure.

Measure:

- task correctness and passing tests;
- policy/requirement compliance;
- required-rule recall;
- unsupported or stale injected claims;
- preservation of negations, numbers, exceptions, and conflicts;
- agent input tokens, tool calls, wall-clock latency, and model cost where applicable;
- incorrect navigation hints;
- no-op precision: how often Othie correctly stays silent;
- host-agent recovery when a hint is wrong.

Use paired tasks, fixed host/model versions, preserved transcripts, and blinded scoring where human judgment is required. Report results by task family, not only as an overall average.

Initial engineering targets may be used to guide iteration, but they are not product facts. Reasonable provisional targets are a median injected brief below roughly 800 tokens, bounded prompt-hook latency, a very low unsupported-directive rate, and a measurable improvement in correctness or compliance on external-context tasks.

### Weeks 3–4: improve retrieval and prepare model adaptation

Use benchmark failures and real opt-in development traces to determine what deserves model training. The most valuable learned tasks are likely:

- decide whether to inject anything;
- classify the task within a declared surface;
- rewrite a prompt into retrieval queries;
- select evidence under a token budget;
- preserve scope, authority, exceptions, numbers, negations, and conflicts;
- generate calibrated advisory navigation hints;
- emit a valid, cited `ContextBrief`.

Do not train the model as a generic repository summarizer or code generator. The host agent already performs those jobs. The model's specialization should be evidence selection, faithful compression, and delivery decisions.

Connect this work to the separate [local model research plan](local-model-research-plan.md). Extend its dataset ontology and evaluator with surface, task phase, injection/no-op labels, navigation-hint quality, and end-to-end task outcomes. Do not scale training until prompt/retrieval baselines and the locked benchmark show what errors actually need learning.

### Month 2: package and distribute the integration

Deliverables:

- a local plugin package containing the relevant skill/instructions, MCP definition, hook adapter, and setup metadata;
- desktop setup flows that install or configure only the hosts a user explicitly selects;
- per-host credentials and least-privilege profile grants;
- versioned compatibility checks and a rollback path;
- clear privacy disclosure about what is local and what a connected cloud host may receive;
- signed/checksummed artifacts and reproducible release metadata.

Plugin installation is not the same in every surface. A web-installed plugin may expose MCP tools and skills but cannot be assumed to deploy executable hook scripts into a user's local environment. Treat local trusted-runtime installation and hosted Chat installation as separate capabilities with separate setup and claims.

Do not submit to public plugin directories until the integration contract, permissions, upgrade behavior, and benchmark are stable. Early pilots can use documented local installation.

### Month 3 and beyond: pilots, administration, and broader sources

Run a small number of design-partner pilots before building a broad connector catalog. Ideal pilot organizations have repeated, measurable AI tasks and important requirements outside their repositories.

Pilot deliverables:

- before/after task outcomes under controlled variants;
- source-authority and freshness workflows;
- opt-in feedback on useful, missing, and incorrect context;
- safe redaction and support diagnostics;
- upgrade, revocation, and rollback evidence;
- a clear economic measure, such as reduced rework or policy violations.

Only then prioritize enterprise administration:

- managed profiles and source policies;
- role-based access and audit events;
- source health/freshness reporting;
- organization-wide deployment and configuration;
- retention and deletion controls;
- approved external connectors and sync jobs;
- evaluation dashboards based on metadata rather than source content.

This is also the point at which accelerator applications become materially stronger. A working engine and model are useful; a benchmark showing clear improvement, one or more repeatable pilot workflows, and evidence that teams will install or pay for the product create the more persuasive story.

## Evaluation design in more detail

### Task families

The benchmark should include at least:

- **external policy:** the correct implementation depends on a rule outside the repo;
- **customer exception:** a generally valid approach is wrong for one scoped customer or environment;
- **fresh external fact:** the agent needs a current API or platform requirement;
- **conflicting authority:** two sources disagree and the agent must not silently merge them;
- **repository-only control:** the workspace already contains everything, so Othie should add little or nothing;
- **adversarial source:** retrieved text attempts to redirect the agent or exfiltrate unrelated data;
- **wrong navigation hint:** the agent must recover by inspecting live code;
- **revocation/freshness:** deleted or superseded content must not remain active.

### Scoring order

Prioritize metrics in this order:

1. no unauthorized disclosure or fabricated directive;
2. correct task outcome;
3. preservation of required qualifiers and conflicts;
4. appropriate use or rejection of Othie context;
5. context size, latency, tool calls, and cost;
6. subjective helpfulness and style.

A concise response that omits a critical exception is worse than a slightly larger faithful response. A polished unsupported instruction is a failure.

### Release gates

Do not release a new model or adapter based only on average quality. Require:

- zero known profile-scope or export-policy regressions;
- no unknown citation IDs accepted;
- revocation checks at final packing/export time;
- adversarial-source tests passing;
- legacy MCP behavior preserved or explicitly versioned;
- per-slice results for conflicts, exceptions, long documents, and no-op cases;
- a recorded host/version compatibility run;
- rollback instructions and artifact identity.

## Privacy and security boundaries

Othie's differentiation depends on trust. Preserve the current local-first boundary and make each new data flow explicit.

- The user chooses indexed sources and profile grants.
- Adapter-provided paths and host metadata influence relevance only; they do not authorize access.
- A hook must not transmit an entire prompt to a remote service unless the user has explicitly configured and authorized that provider.
- Tool and hook output may be sent by the host to its model provider. Product copy must say so plainly.
- Logs should store identifiers, timing, sizes, modes, and outcome labels by default—not source text, compiled context, or raw prompts.
- External facts need source URL, retrieval time, and freshness policy.
- Retrieved content is untrusted data and cannot redefine the engine's instructions or permissions.
- The adapter fails open for host availability but fails closed for data authorization.

## Product decisions to hold unless evidence changes them

| Decision | Recommendation | Revisit when |
| --- | --- | --- |
| Product category | Context compiler and delivery layer | Users repeatedly demand a standalone agent and it wins controlled tests |
| First wedge | Coding agents | Hook access becomes unavailable or another surface has materially stronger demand |
| Protocol | MCP for interoperable tools/results | A host requires another transport; add an adapter rather than replacing the core |
| Coding navigation | Advisory hints | Hard filtering proves safer and better across dependency-heavy tasks |
| Structured result | Versioned `ContextBrief` plus text fallback | All supported hosts reliably consume the same richer format |
| Surface detection | Explicit adapter metadata first | A reliable cross-host standard emerges |
| Model role | Selection, fidelity, compression, routing | Benchmarks show another learned task is the bottleneck |
| Default behavior | Small useful brief or no-op | Repeated benchmark evidence supports broader automatic context |
| Connector breadth | After delivery proof and pilots | A particular source blocks a committed pilot |

## Explicit non-goals for the next month

- building another IDE or general-purpose agent;
- replacing host repository search;
- silently restricting which code files an agent may inspect;
- indexing every possible SaaS source;
- training a model before an end-to-end baseline exists;
- promising automatic context injection in hosts that expose only model-selected tools;
- sending source documents or prompts to a remote service by default;
- building enterprise fleet administration before individual reliability is proven;
- optimizing primarily for an accelerator application rather than user evidence.

## Open questions to answer with prototypes and data

1. How often does turn-start injection help compared with explicit/on-demand retrieval?
2. Which task signals predict that Othie should stay silent?
3. Are navigation hints useful after controlling for the extra tokens they add?
4. How much host context can Othie observe without creating an unacceptable privacy or setup burden?
5. What latency budget feels invisible in Codex and Claude Code?
6. When should a brief refresh during a long task?
7. Which sources create the strongest initial pilot value: internal policy, customer requirements, engineering standards, product decisions, or current vendor documentation?
8. Does the trained compiler beat a prompt-only 4B baseline and deterministic selection on the locked end-to-end benchmark?

## Research basis

These product facts were checked against current primary documentation on September 11, 2026:

- [OpenAI plugins](https://learn.chatgpt.com/docs/plugins): plugins can bundle skills, MCP servers, hooks, and related capabilities across Chat, Work, and Codex; executable hooks still require an appropriate runtime environment.
- [OpenAI hooks](https://learn.chatgpt.com/docs/hooks): Codex hook events include prompt submission and support adding developer context. The documentation also warns that excessive injected context can degrade performance.
- [OpenAI MCP and connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp): connectors are OpenAI-maintained MCP wrappers, while remote MCP servers expose third-party tools to the API.
- [OpenAI MCP setup](https://learn.chatgpt.com/docs/extend/mcp): MCP configuration and trust remain host-specific.
- [Claude Code plugins](https://code.claude.com/docs/en/plugins): Claude Code plugins can package commands/skills, agents, hooks, MCP servers, and other integration components.
- [Claude Code MCP](https://code.claude.com/docs/en/mcp) and [hooks](https://code.claude.com/docs/en/hooks): MCP and hooks are distinct integration mechanisms.
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools), [resources specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources), and [lifecycle specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle): protocol capabilities and client metadata do not define Othie's product-level surface taxonomy.
- [Lost in the Middle](https://arxiv.org/abs/2307.03172): larger context windows do not guarantee uniform use of all supplied information.
- [RepoCoder](https://arxiv.org/abs/2303.12570): repository-level retrieval can improve code completion, reinforcing the value of measured retrieval while not establishing Othie's external-context claims.

Documentation and host behavior can change. Recheck the cited host documentation when implementing, packaging, or making compatibility claims.
