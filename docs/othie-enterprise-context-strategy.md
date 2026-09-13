# Othie’s Enterprise AI Context Strategy

## Executive recommendation

Othie should become the **policy-aware decision-context compiler for AI agents**.

The product should deliver a small, authorized, cited brief containing the organizational decisions an agent cannot reliably infer from the repository or the user’s prompt: current policies, customer-specific exceptions, architectural decisions, approved precedents, operating constraints, and required verification checks. It should deliver that brief at the moment the host agent is about to decide what to do, while leaving repository exploration, implementation, and final judgment to the host agent.

The clearest starting message is:

> Every coding agent can read the repository. Othie gives it the decisions the repository does not contain—before it starts.

This is narrower and more defensible than “enterprise context,” “AI memory,” or “better RAG.” Those broader categories already contain well-funded platforms, vendor-native memory, knowledge graphs, and retrieval infrastructure. Glean now explicitly markets a “system of context” that joins enterprise search, a permissions-aware graph, and APIs; Atlassian Rovo connects search, chat, agents, and a Teamwork Graph; Microsoft offers enterprise connectors and agentic retrieval.[^1][^2][^3][^4] Othie should integrate with those systems where useful, not try to reproduce their breadth.

The fastest credible MVP is a four-to-six-week product centered on two local coding-agent integrations:

1. Harden the existing Codex prompt-start adapter.
2. Add Claude Code using its `UserPromptSubmit` hook and an Othie MCP tool.
3. Upgrade `ContextBrief` into an auditable decision brief with authority, scope, freshness, conflicts, export classification, and a delivery receipt.
4. Prove value with a small benchmark and three design-partner pilots before building broad connectors or enterprise administration.

Chat and general work should follow, but not as equal launch surfaces. Chat is crowded by native company-knowledge products and gives Othie less control over whether context is fetched before the model’s first decision. Local Work tasks and enterprise-built agent APIs are better second-wave surfaces because Othie can participate more deterministically in the execution loop.

The central strategic choice is therefore:

| Do | Do not |
|---|---|
| Compile trusted organizational decisions into a bounded brief | Index every enterprise document |
| Deliver before the agent’s first consequential decision | Depend on the model to remember to search |
| Preserve authority, scope, freshness, conflicts, and evidence | Flatten retrieved text into a confident summary |
| Treat a correct no-op as a product success | Inject context on every turn or tool call |
| Measure task outcomes against the same host and model | Sell token count, retrieval recall, or vague “memory” |
| Integrate with agents and knowledge systems | Build another IDE, chatbot, or autonomous agent |

## What is already built

The current implementation is a real vertical slice, not merely a roadmap concept.

The engine already defines surface and phase metadata plus a structured `ContextBriefV1`; the MCP bridge exposes `get_organization_context` and `get_context_status`; and the Codex adapter handles `UserPromptSubmit`, requests a code/turn-start brief, applies a two-second deadline, validates the result, and fails open when Othie is unavailable or has nothing useful to add. See the current [engine types](../packages/engine/src/types.ts), [MCP bridge](../packages/engine/src/mcp/bridge.ts), and [Codex adapter](../integrations/codex/src/user-prompt-submit.ts).

The project’s recorded verification shows 49 passing tests across the engine, website, Codex adapter, and MCP/process boundary.[^5] It also identifies the important remaining gaps: there is not yet a recorded manual Codex host acceptance run, a real-model outcome comparison, a Windows run, or a native hosted-agent acceptance test. The current packer preserves whole rules, excerpts, synthesis, citations, explicit conflicts, and a token budget, but `external_facts`, `navigation_hints`, and `verification_checks` are still empty placeholders. See [verification.md](verification.md) and [packing.ts](../packages/engine/src/context/packing.ts).

This changes the immediate plan. Othie does not need another architecture phase before talking to users. It needs proof that the existing slice changes agent outcomes safely and repeatably.

### Assessment of the current roadmap

The current [context-delivery roadmap](context-delivery-roadmap.md) has the right foundational thesis:

- Othie is a context compiler and delivery layer, not another agent.
- Retrieval eligibility and authorization should be deterministic.
- Navigation guidance should remain advisory.
- The host agent should continue searching the live workspace.
- Context should be bounded, cited, conflict-aware, and allowed to be empty.
- Coding agents are the first wedge.

The research sharpens that plan in five ways.

First, the category must become more specific. “Context layer” overlaps directly with Glean, Rovo, Microsoft 365, model-vendor memory, and generic retrieval. “Decision context for software agents” identifies a narrower job and a more measurable failure mode.

Second, the existing day-one slice is farther along than the roadmap language implies. Manual acceptance and outcome evidence now matter more than another abstraction layer.

Third, Codex and Claude can support prompt-conditioned context before the model processes the user’s request, but current Cursor hooks cannot provide an equivalent prompt-conditioned injection path. Cursor’s `beforeSubmitPrompt` hook can continue or block, while `additional_context` is available on other events such as session start or post-tool hooks.[^6] Host parity must therefore be defined by outcome, not by pretending every host offers the same lifecycle.

Fourth, privacy cannot be delegated to the model. A 2026 enterprise-agent benchmark found substantial rates of contextual-integrity violations and found that stronger models or additional reasoning did not reliably eliminate them.[^7] Othie’s deterministic eligibility, permission, and export checks are not supporting features; they are part of the core product.

Fifth, “taste” and “judgment” should become reviewed organizational precedent, not automatically learned user memory. Tacit judgment is valuable precisely because it includes exceptions, tradeoffs, and awareness of when a rule should not apply. An unreviewed summary of past conversations can turn that nuance into a new source of error.

## The problem Othie should own

Enterprise AI failures are often described as “the model lacks context.” That phrase combines several different problems:

1. **Discovery:** The relevant information exists but the agent does not know where to look.
2. **Selection:** The agent finds too much information and cannot distinguish decisive constraints from background material.
3. **Authority:** Two sources disagree, and the agent does not know which one governs.
4. **Scope:** A true rule applies to a different product, customer, geography, environment, or time period.
5. **Freshness:** A once-correct decision has expired or been superseded.
6. **Privacy:** Information is relevant but is not authorized for this user, task, host, or model provider.
7. **Delivery:** The right information arrives after the agent has already formed a plan or made a tool call.
8. **Judgment:** The organization’s preferred tradeoff is embedded in examples and experienced people rather than a single rule.

Generic retrieval mainly addresses discovery. Larger context windows mainly increase capacity. Neither guarantees correct selection, authority, scope, privacy, or timing. Research on long-context models shows that performance depends on where relevant information appears and can degrade as context length and task complexity rise, so “put everything in the prompt” is not a dependable strategy.[^8][^9]

The Othie problem statement should be:

> AI agents can inspect the work in front of them, but consequential company decisions often live elsewhere and carry permissions, scope, exceptions, and expiration. Othie compiles only the decisions that govern the current task and delivers them before the agent acts.

That statement is concrete enough to test. It also avoids claiming that Othie can recreate a senior employee’s entire experience. The product can transfer explicit institutional judgment and curated precedents; it cannot guarantee human taste or eliminate the need for review.

## Why coding agents are the right first wedge

Coding provides the strongest initial combination of pain, observability, integration control, and measurable outcomes.

Experienced engineers know facts that are often absent from the working tree: which compatibility promise matters, why a tempting library was rejected, which customer exception is still active, what data must never cross a boundary, what rollout is politically or operationally acceptable, and which tests constitute proof. A coding agent can search the repository well and still make the wrong organizational decision.

The cost is measurable through changed files, test results, policy compliance, review comments, rework, and task completion. This matters because raw AI adoption or perceived speed can be misleading. In a randomized controlled trial involving experienced open-source developers working in repositories they knew well, METR found that the studied early-2025 tools made participants 19% slower on average, despite participants expecting a speedup.[^10] The result is limited to its sample, repositories, and tool generation, but it reinforces the need to measure Othie through task outcomes rather than enthusiasm.

Coding-agent platforms also expose useful lifecycle controls. OpenAI’s hook system can run `UserPromptSubmit` before the prompt is processed and inject `additionalContext`; `SessionStart` can run after compaction and add context before the next model request.[^11] Claude Code similarly supports `UserPromptSubmit` context injection, including direct calls to an already connected MCP tool.[^12] Those are unusually strong insertion points for proving Othie’s thesis.

The first ideal customer profile is:

- A software company with roughly 30–300 engineers.
- At least 10 active users of Codex, Claude Code, Cursor, or similar agents.
- Important requirements live outside repositories in product, security, architecture, support, or customer documents.
- The company experiences recurring “technically correct, organizationally wrong” changes.
- A platform, developer-experience, security-engineering, or AI-enablement owner can sponsor installation and measure outcomes.
- One or more source owners are willing to curate authoritative decisions and create representative test cases.

Regulated or high-consequence B2B software may feel the pain earlier, but Othie should not begin by marketing itself as a compliance product. That would raise the proof and liability bar before the product has earned it.

## Product category and positioning

### Recommended category

**Enterprise decision-context infrastructure for AI agents**

The technical description can remain “policy-aware context compiler.” The buyer-facing category should focus on the result: an agent makes decisions using the current organizational constraints and precedents that govern the task.

Recommended one-line descriptions:

- “Othie gives coding agents the company decisions their repositories do not contain.”
- “Othie compiles the smallest trustworthy brief an AI agent needs before it acts.”
- “Keep every coding agent aligned with current policies, exceptions, and architectural decisions—without copying the whole company into the prompt.”

### Categories to avoid

**AI memory.** GitHub Copilot Memory already stores repository facts and user preferences, revalidates code-cited facts against the current branch, and manages repository-scoped memory.[^13] LangGraph and Letta also expose general memory primitives for stateful agents.[^14][^15] Othie’s opportunity is not to remember more; it is to deliver governed, cross-system institutional decisions.

**Enterprise search.** Glean, Rovo, Microsoft, and existing search platforms already have connector breadth, permission graphs, ranking, and enterprise administration. Othie can consume their results or APIs later.

**Generic RAG.** Retrieval stacks increasingly decompose questions, issue multiple searches, rerank, and return citations. Microsoft’s agentic-retrieval implementation is one example.[^16] Othie’s differentiation must sit after retrieval and before action: deciding which authorized facts govern the task, preserving disagreements and exceptions, and packing them for the host.

**Another agent or IDE.** The host agent should own planning, repository search, tool use, implementation, and verification. Othie should remain composable and host-neutral.

**A policy-enforcement product—at first.** Model-visible guidance is probabilistic. MCP’s own guidance cautions that server instructions are not a security boundary because hosts may use them differently.[^17] Othie can later add deterministic pre-tool policy checks, but advisory context and enforcement must be separate product planes.

## Competitive landscape

| Alternative | What it does well | Where Othie can win | Where Othie is weaker |
|---|---|---|---|
| Static `AGENTS.md`, `CLAUDE.md`, rules, custom instructions | Simple, local, predictable, versionable | Dynamic task selection; centralized revocation; cross-repo scope; authority and conflicts | Static files have nearly zero operational dependency |
| Vendor memory, such as Copilot Memory | Native UX; repository facts; user preferences | Cross-system organization decisions; cross-host consistency; explicit authorization and export policy | Vendor memory has distribution and native product integration |
| Glean / Rovo / Microsoft 365 | Connector breadth, enterprise search, permission graphs, administration | A bounded decision brief at the agent boundary; host-neutral schema; coding-specific evals; no-op behavior | Othie lacks their corpus coverage, ranking maturity, and admin footprint |
| Generic RAG / vector search | Flexible retrieval and large ecosystem | Authority, scope, exception, conflict, freshness, and delivery semantics | Othie should reuse—not rebuild—commodity retrieval |
| LangGraph / Letta and agent memory frameworks | Developer control over agent state and memory | Managed institutional context independent of one agent runtime | Frameworks are more flexible for bespoke applications |
| Host-native MCP tools | Broad compatibility and explicit tool use | Automatic pre-decision delivery where hooks allow it; consistent `ContextBrief`; evaluation and receipts | MCP-only access may depend on the model choosing the tool |

The most important competitive conclusion is uncomfortable but useful: Othie cannot win by having “more context.” It can win by being more selective, more trustworthy, earlier in the decision loop, and easier to evaluate.

## The product model

Othie should have three deliberately separate planes.

```text
Source systems
  decisions · policies · exceptions · precedents · customer constraints
       │
       ▼
Trust plane
  identity · authorization · scope · freshness · supersession · export policy
       │
       ▼
Context compiler
  retrieve · resolve · preserve conflicts · budget · render · no-op
       │
       ▼
Delivery plane
  prompt hook · MCP tool · agent SDK middleware · explicit mention
       │
       ▼
Host agent
  inspect live work · plan · use tools · implement · verify
       │
       ▼
Evaluation plane
  receipt · latency · outcome · corrections · coverage gaps
```

The **trust plane** makes deterministic decisions about what may be considered and exported. The **context compiler** produces model-visible advisory context. The **evaluation plane** records metadata and outcomes without silently collecting prompt or source content. Keeping these separate prevents a dangerous claim that a model-visible brief is itself enforcement.

### The atomic unit is a decision, not a document chunk

A document chunk is useful evidence, but it is not the ideal product object. Othie should introduce a reviewed `DecisionRecord` that can be created manually or derived from an approved source:

```yaml
id: dec_payments_retries_004
situation: A service retries a third-party payment mutation
decision: Use an idempotency key and do not retry ambiguous failures automatically
rationale: Duplicate charges are more damaging than a delayed manual recovery
scope:
  repositories: [billing-api, checkout]
  environments: [production]
  regions: [all]
authority:
  owner: payments-platform
  level: architecture-decision
effective_at: 2026-08-15
expires_at: null
supersedes: [dec_payments_retries_002]
exceptions:
  - scope: sandbox
    decision: Automatic retry is allowed
evidence:
  - source_id: adr-148
    locator: section-3
export_class: internal-model-approved
status: active
```

This is how Othie can begin to encode organizational judgment without pretending to learn taste automatically. A later workflow can propose a new decision record after a task, but a human source owner should approve promotion into trusted context.

### `ContextBrief` should become a decision artifact

The next version should be compact enough for prompt injection and structured enough for APIs and audits.

```ts
type ContextBriefV1_1 = {
  version: "1.1";
  brief_id: string;
  task_fingerprint: string;        // non-reversible or locally scoped
  generated_at: string;
  expires_at?: string;
  corpus_revision: string;
  policy_revision: string;
  request: {
    host: string;
    surface: "code" | "chat" | "work" | "unknown";
    phase: "turn_start" | "on_demand" | "post_discovery" | "post_compaction";
  };
  status: "useful" | "no_op" | "degraded";
  no_op_reason?: "no_match" | "not_authorized" | "below_threshold" | "stale_only";
  items: Array<{
    id: string;
    type: "must" | "should" | "fact" | "precedent" | "warning" | "check";
    text: string;
    authority: string;
    scope: string[];
    freshness: { effective_at?: string; expires_at?: string };
    evidence: Array<{ source_id: string; locator?: string }>;
    conflict_group?: string;
    export_class: string;
  }>;
  conflicts: Array<{
    group: string;
    item_ids: string[];
    resolution: "unresolved" | "authority" | "newest" | "explicit_exception";
  }>;
  budget: { max_tokens: number; estimated_tokens: number };
  receipt_hash: string;
};
```

The human-readable rendering should lead with mandatory constraints and unresolved conflicts, then include supporting facts or precedents, then verification checks. It should never hide a conflict inside synthesis. A `no_op` should be a first-class response with a reason, not an error or an empty string.

The receipt should prove which brief revision was delivered without logging its contents. It can combine the brief ID, policy revision, corpus revision, item IDs, and rendered-content hash. That creates an audit and evaluation primitive without turning Othie into employee surveillance.

## End-to-end integration by AI usage flow

### Coding agents

The preferred flow is:

1. A developer submits a task.
2. A host lifecycle hook sends only the minimum routing metadata Othie is allowed to use.
3. Othie deterministically filters eligible sources for identity, workspace, host, provider, and export class.
4. Othie retrieves candidate decisions and evidence.
5. The compiler scores usefulness, resolves supersession, preserves conflicts, and packs to the host budget.
6. If useful, the host receives the rendered brief before its first model decision; otherwise Othie returns a reasoned no-op.
7. The host inspects the live repository and performs the task normally.
8. Othie records a content-free delivery receipt and outcome metadata.
9. A later refresh occurs only after compaction, a material scope change, or explicit/on-demand retrieval.

OpenAI’s `UserPromptSubmit` and Claude Code’s equivalent can support this pre-decision pattern.[^11][^12] This should be the flagship experience.

### Chat

Hosted chat is different. In many chat products the first model call decides whether to invoke a tool, so Othie may not influence that first decision. The realistic access modes are:

1. Explicit user mention of Othie.
2. A skill or plugin that tells the host when to call Othie.
3. Model-selected MCP tool use.
4. A custom application that calls Othie before making the model request.

ChatGPT Company Knowledge can use supported custom MCP apps with search and fetch, applies existing source permissions, and gives enterprise administrators controls over apps and access.[^18] ChatGPT custom MCP deployment is therefore a useful distribution path, but it is not the first MVP. Hosted ChatGPT cannot simply attach to a developer’s local server; private/local deployment requires an approved remote connection mechanism such as Secure MCP Tunnel, plus enterprise authentication and administration.[^19]

The correct chat promise is “Othie can answer with governed organizational context when invoked,” not “every chat automatically contains Othie context.” A custom enterprise chat or API integration can provide the stronger automatic guarantee later.

### Work and long-running tasks

Work tasks need an initial brief and selective refresh, not context on every internal step.

For a local Work runtime that supports the same hook system, Othie should:

- inject a task brief at start;
- refresh after compaction;
- refresh when the task crosses a declared workspace, customer, environment, or deliverable boundary;
- expose an on-demand MCP call for questions discovered during execution;
- avoid injection on routine file reads and low-risk tool calls.

For cloud work, assume no access to the user’s local filesystem or credentials unless separately connected and authorized. Local and cloud execution have different data paths and controls and should be represented as separate deployment profiles.[^20][^21]

### Enterprise-built agents

Many valuable enterprise agents will not live in a commercial chat or IDE. Othie should eventually provide thin middleware for OpenAI’s Agents/Responses APIs, Anthropic’s Agent SDK, and common orchestration frameworks.

The API pattern should be simple:

```text
begin task → compile brief → attach as developer context → run agent
              ↑                                      │
              └──── refresh on scope/compaction ─────┘
```

This surface is strategically attractive because the customer controls the first model call. It also makes A/B evaluation easier. It belongs after the local coding wedge because SDK breadth can otherwise consume the company before the core value is proven.

## Host integration matrix

| Host/surface | Best initial integration | Pre-first-decision context? | Enterprise considerations | Recommendation |
|---|---|---:|---|---|
| Codex local / ChatGPT Work local | `UserPromptSubmit`; `SessionStart` after compaction; Othie MCP for on-demand use | Yes | Hooks can be managed; context limit and trust configuration matter | **Ship first; current adapter exists** |
| Claude Code | Plugin with `UserPromptSubmit` calling an Othie MCP tool; later `PostToolBatch`/compaction refresh | Yes | Multiple hook types and managed/plugin distribution; test timeout/failure semantics | **Ship second** |
| Cursor | MCP tool, rule/skill, custom agent; optional hook for validation or later context | Not equivalently through `beforeSubmitPrompt` today | Team-managed hooks and security controls exist; lifecycle differs | **Support explicitly, do not promise parity** |
| GitHub Copilot coding agent | Repository/custom-agent MCP tool and instructions | Usually model-selected | Cloud MCP currently has tool/auth constraints; native Memory overlaps generic memory | **Pilot later** |
| ChatGPT Company Knowledge | Remote custom MCP app with search/fetch | Often after model/tool selection | Admin publication, RBAC, provider auth, schema/version operations | **Distribution after local proof** |
| Custom enterprise agent | SDK or gateway middleware before model invocation | Yes | Customer identity, provider policy, logging, regional deployment | **Third strategic surface** |

OpenAI plugins can bundle skills, MCP servers, and hooks across supported Chat, Work, and Codex environments, but hook scripts must exist in the execution environment; publishing a web plugin does not by itself deploy local scripts.[^22] Packaging should therefore be treated as a deployment product, not just a manifest.

GitHub Copilot’s cloud coding agent can use MCP tools, but current documentation notes constraints including tool-focused integration and limits around remote OAuth flows.[^23] It is a meaningful future host but a poor place to prove Othie’s automatic pre-decision advantage.

## Security and trust design

Othie’s enterprise value depends on being trusted with less information, not merely being able to access more.

### Deterministic controls

Before retrieval or model-visible synthesis, Othie should evaluate:

- authenticated user and group membership;
- requested workspace/repository and task surface;
- source-level and item-level access;
- target host, target model provider, and execution location;
- export classification;
- geographic or tenant restrictions;
- source status, effective date, expiration, and supersession;
- requested token budget and logging policy.

These decisions must be inspectable and testable without asking an LLM. The model can help rank authorized candidates, but it must not decide whether private content may be exported.

MCP authorization guidance is built around OAuth 2.1-era protections, audience/resource binding, PKCE, and explicit token handling; it prohibits token passthrough patterns that bypass proper resource validation.[^24] Othie should follow those constraints rather than acting as a universal credential proxy.

### Retrieved content is untrusted

Documents, tickets, web pages, and tool output can contain instructions that attempt to redirect an agent. Retrieval-augmented generation does not remove prompt-injection risk.[^25] Othie should:

- treat retrieved text as evidence, never executable instruction;
- distinguish Othie-generated framing from source quotations;
- sanitize and delimit excerpts;
- avoid rendering secrets or tokens even when they appear in an authorized source;
- cap excerpt length and number of sources;
- show provenance and export class;
- prevent source content from changing the compiler’s policy or tool configuration;
- test indirect injection and conflicting-instruction cases.

### Advice is not enforcement

`must` means “the source identifies this as mandatory,” not “the host is technically prevented from violating it.” If customers need prevention, Othie should later offer a separate policy check before selected high-risk tools or deployments. Cursor’s security guidance likewise distinguishes probabilistic steering from deterministic controls such as approvals, hooks, and sandboxing.[^26]

### Privacy-preserving telemetry

Default telemetry should include:

- brief ID and receipt hash;
- host, surface, phase, and adapter version;
- policy and corpus revisions;
- item IDs and types, not item text;
- token estimate, latency, timeout/failure code, and no-op reason;
- optional customer-defined task outcome and reviewer correction labels.

Prompts, source excerpts, generated code, and model responses should be off by default. Content sampling for evaluation should require a separate, explicit, time-bounded project policy.

## MVP: what to build now

### MVP promise

> For a coding task with relevant off-repository decisions, Othie delivers an authorized, cited brief before the agent starts and measurably reduces hidden-context mistakes—without sending the full prompt or corpus to Othie’s cloud.

### Required scope

1. **Codex acceptance path**
   - Complete a real host run from prompt submission through injected context and agent output.
   - Demonstrate useful, no-op, unauthorized, timeout, invalid-response, and revoked-source cases.
   - Record the host/version/configuration matrix.

2. **Claude Code adapter**
   - Package a `UserPromptSubmit` hook that calls the existing Othie MCP tool.
   - Reuse the same request metadata, fixtures, brief renderer, timeout policy, and failure codes.
   - Add a selective refresh path after compaction or material discovery.

3. **`ContextBrief` 1.1**
   - Add authority, scope, freshness, export class, conflict groups, policy/corpus revisions, no-op reasons, and a delivery receipt.
   - Keep text rendering deterministic.
   - Do not populate `external_facts`, navigation hints, or verification checks until they have real source semantics and tests. Removing empty MVP fields is better than implying capability.

4. **Decision-source format**
   - Support a local, version-controlled decision manifest alongside existing files.
   - Include owner, effective date, expiration, supersession, exceptions, scope, evidence, and export class.
   - Add linting for missing owners, expired records, dangling supersession, and overlapping/conflicting scope.

5. **Benchmark harness**
   - Run the same tasks, host, model, starting commit, tool permissions, and time/token budget with and without Othie.
   - Store expected constraints and grading rubrics outside the agent-visible workspace.
   - Produce a short pilot report, not a vanity dashboard.

6. **Diagnostics and local observability**
   - `othie diagnose`: identity, sources, hook reachability, MCP status, latency, version.
   - `othie explain <brief-id>`: why items were included, excluded, or marked conflicting.
   - `othie policy lint`: stale, ambiguous, or invalid decision records.
   - Content-free receipts and exportable metrics.

### Explicitly out of scope

- A general chat application.
- A new coding agent or IDE extension.
- Automatic learning from every conversation or pull request.
- A proprietary language model or fine-tune.
- A broad connector marketplace.
- A company-wide knowledge graph.
- Autonomous writes back to source systems.
- Full enterprise fleet management, SCIM, or a large admin dashboard.
- A deterministic compliance claim.
- Context injection on every file read, tool call, or internal turn.

## Four-to-six-week delivery plan

### Week 1: prove the current slice

- Run and document manual Codex acceptance on a real model.
- Add fixtures for hidden rule, scoped exception, stale source, direct conflict, revoked access, malicious retrieved instruction, and correct no-op.
- Implement `ContextBrief` 1.1 identifiers, policy/corpus revisions, no-op reasons, authority/scope/freshness, and receipt hash.
- Freeze one stable human-readable renderer.
- Build an initial 12–20-task benchmark.

**Exit gate:** Othie demonstrably changes at least one agent outcome through a real prompt-start injection; all privacy and failure-mode tests pass.

### Week 2: make the wedge cross-host

- Build the Claude Code hook/plugin using `UserPromptSubmit` and the Othie MCP tool.
- Run shared golden fixtures across Codex and Claude.
- Add compaction/session refresh for the two hosts where supported.
- Keep the current fail-open deadline; measure actual p50 and p95 latency before changing it.

**Exit gate:** The same decision manifest produces semantically equivalent briefs in two host agents, with documented lifecycle differences.

### Week 3: make it operable

- Ship `diagnose`, `explain`, and `policy lint` commands.
- Add source-owner and revision workflows.
- Create a minimal install package and removal/rollback instructions.
- Produce an enterprise-readable data-flow and threat-model document.
- Add metadata-only event export.

**Exit gate:** A design partner can install and troubleshoot Othie without a founder editing its machine by hand.

### Weeks 4–6: pilots and iteration

- Onboard three design partners, one engineering team each.
- Use one to three sources and ten repeated task archetypes per partner.
- Compare baseline and Othie-assisted outcomes.
- Review every false positive, missed constraint, conflict, and human correction.
- Build only the connector or packaging work required by a committed pilot.

**Exit gate:** At least two partners show a meaningful improvement in their chosen hidden-context outcome and ask to continue or expand. If they do not, revisit the wedge before building enterprise breadth.

## Evaluation plan

### Benchmark variants

| Variant | Description | Purpose |
|---|---|---|
| A | Host agent alone | True baseline |
| B | Naive retrieved excerpts appended without Othie’s trust/packing semantics | Tests whether generic RAG is enough |
| C | Othie decision brief at prompt start | Tests the core product |
| D | Othie brief plus selective refresh after compaction/material discovery | Tests the later-loop extension |

For the first week, A versus C is enough. B and D are valuable once the harness is stable.

### Task set

Every task should have a real implementation component plus a hidden organizational constraint. Include:

- a global rule that should change the implementation;
- a narrower exception that should override a broad rule;
- two conflicting sources that must remain visibly unresolved;
- an expired or superseded rule that must not be applied;
- a relevant but unauthorized source that must not be exported;
- an irrelevant corpus where the correct result is no-op;
- a malicious instruction embedded in retrieved content;
- a task whose scope changes after repository discovery;
- a long-running task that compacts its context;
- a case where the repository contradicts a stale external statement and the conflict should be surfaced.

### Primary metrics

- **Constraint compliance:** Did the final change honor the governing rule or exception?
- **Critical-context recall:** Were all decisive authorized items delivered?
- **Unauthorized export count:** Did any prohibited item or excerpt leave the trust boundary?
- **Conflict preservation:** Did the brief expose disagreement without inventing resolution?
- **No-op precision:** When Othie injected nothing, was nothing actually needed?
- **False-guidance rate:** Did Othie cause a worse decision than the baseline?
- **Human correction time:** How much review or rework was needed?
- **Task success:** Did the implementation pass the functional rubric and tests?

### Operational metrics

- p50/p95 compilation and hook latency;
- timeout and degraded-mode rate;
- estimated injected tokens;
- cache hit rate by policy/corpus revision;
- briefs per task and refresh frequency;
- installation and diagnosis success rate.

### Provisional launch targets

These are hypotheses to validate, not researched industry standards:

- Zero unauthorized exported items in the benchmark and pilot.
- Median brief at or below 800 tokens.
- At least a 20 percentage-point improvement in hidden-constraint compliance over the same host/model baseline.
- At least 90% no-op precision.
- Fewer than 5% critical-exception misses.
- p95 prompt-start path within the current two-second deadline, with safe fail-open behavior.
- No statistically or practically meaningful increase in unrelated task failures.

The exact improvement threshold may change with task difficulty and sample size. Security failures should not be averaged away: one unauthorized export is an incident to investigate, not a small reduction in a score.

## Pilot design and go-to-market

### The offer

Sell an **Agent Context Reliability Pilot**, not a platform transformation.

Scope:

- one engineering team;
- Codex or Claude Code;
- one to three curated source collections;
- ten repeated task archetypes;
- two weeks of measured use after setup;
- a baseline-versus-Othie evaluation;
- a data-flow and privacy review;
- a final coverage and failure report.

The buyer receives concrete evidence: which decisions agents were missing, which mistakes Othie prevented, which sources remain ambiguous, what data crossed each boundary, and whether the improvement justifies wider rollout.

The strongest early champions are staff/principal engineers, developer-platform leaders, and AI-enablement owners. The economic buyer is likely a VP/Head of Engineering or CTO for the first small customers, with security and IT becoming required approvers as deployments expand.

### Design-partner qualification

Ask prospects:

1. “Tell me about the last change an AI agent made that was technically plausible but wrong for your company.”
2. “Where was the missing decision recorded, if anywhere?”
3. “How often does the same class of mistake recur?”
4. “Who is allowed to decide which source is authoritative?”
5. “Can we create ten safe, representative tasks and compare the same agent with and without Othie?”
6. “Would you install a local hook or plugin on a pilot team?”

Good candidates can answer with specific failures and source owners. Poor first candidates want a generic chatbot, have no consequential off-repository constraints, will not install an adapter, or require dozens of connectors before testing one outcome.

### Pricing hypothesis

Do not optimize seat pricing yet. The first two or three partners can be design partnerships with a clear exchange of time and data. After repeatable value appears, test a paid pilot based on team scope and integration effort, then an annual platform fee with active-agent or active-developer bands.

A proposed paid-pilot range of roughly $5,000–$15,000 is a sales hypothesis, not a market fact. The important test is whether a buyer assigns budget to preventing context-related rework and risk. Avoid free indefinite pilots that generate enthusiasm but no purchase signal.

### Distribution

- Publish the adapter and `ContextBrief` schema or SDK openly if doing so does not expose proprietary policy logic. Trust and host compatibility benefit from inspectable code.
- Keep authorization, source governance, enterprise administration, and advanced compilation as the commercial control plane.
- Publish benchmark tasks, failure transcripts, and before/after outcomes.
- Offer a lightweight “agent context coverage scan” that maps where engineering decisions live and which are invisible to current agents.
- Land in one engineering team, then expand to local Work, internal agent APIs, and hosted chat.

Broad app directories should come after a repeatable pilot. Distribution without a sharp job will create many shallow trials and little evidence.

## Capturing experience, taste, and judgment

The founder insight—that experienced humans carry context, taste, and judgment that models lack—is correct, but the product must divide that insight into solvable parts.

### What Othie can capture now

- explicit architecture and product decisions;
- rationales and rejected alternatives;
- examples of acceptable and unacceptable outcomes;
- customer, environment, and jurisdiction exceptions;
- escalation rules and required reviewers;
- temporal validity and supersession;
- verification practices used by trusted experts.

### What requires caution

- unstated intuition;
- interpersonal or political judgment;
- novel tradeoffs without precedent;
- preferences inferred from a single person’s behavior;
- decisions whose authority is disputed;
- outcomes whose success is visible only months later.

### Recommended phase-two workflow

After a task, Othie can detect that a human correction introduced a potentially reusable decision. It should draft a proposed record containing the situation, decision, rationale, counterexample, scope, owner, effective date, and evidence. A designated owner approves, edits, rejects, or limits it. Only approved records enter the trusted corpus.

This creates a compounding data asset without allowing the model to silently rewrite company policy. It also makes “taste” operational: a library of reviewed precedents and counterexamples, each scoped and owned.

## Strategic risks and responses

### The platform vendors absorb the feature

They will absorb generic memory and search. GitHub Copilot Memory already demonstrates this direction, and enterprise search vendors are exposing context through MCP.[^13][^1] Othie’s defense is cross-host neutrality, deterministic trust semantics, decision-level structure, rigorous evaluation, and a workflow for reviewed organizational precedent.

### The brief is ignored by the model

Model-visible context is not a guarantee. Measure compliance by host/model/version, put decisive constraints early, keep briefs short, and add deterministic enforcement only for narrowly defined high-risk actions. Do not represent advisory delivery as control.

### Retrieval quality dominates the product

Use existing search systems and connectors when available. Othie should own the trust-aware compile step. If a pilot lacks search infrastructure, begin with curated manifests and a small number of sources rather than building a general crawler.

### Customers will not curate decisions

This is a real adoption risk. Test it immediately. Make source ownership and linting lightweight; derive draft records from existing authoritative material; show ambiguity instead of demanding a perfect knowledge base. If no one will own decisions, Othie cannot safely manufacture authority.

### Hook installation is too difficult

Ship diagnostics, rollback, signed packages, and managed deployment instructions. Where automatic hooks are unavailable, provide explicit MCP and skill paths but communicate the weaker guarantee.

### Latency removes the benefit

Cache by identity, workspace, policy revision, corpus revision, and coarse task signature; compile locally where possible; enforce a hard deadline and fail open. A stale cached brief should not be used if policy or source revisions invalidate it.

### Context becomes a new exfiltration path

Keep source eligibility and provider export deterministic, bind tokens to intended resources, minimize metadata, treat content as untrusted, and test authorization separately from relevance. The NIST Generative AI Profile emphasizes provenance, source review, risk measurement, and the role of human domain knowledge and business rules; those should map directly into product controls.[^27]

## Decisions to make now

1. **Adopt the category:** “enterprise decision-context infrastructure for AI agents.”
2. **Commit to the first job:** prevent technically plausible but organizationally wrong coding changes.
3. **Name the core artifact:** `ContextBrief`, backed by reviewed `DecisionRecord` objects.
4. **Choose the first two hosts:** Codex and Claude Code.
5. **Make trust semantics product-level:** authority, scope, freshness, supersession, conflicts, export class, and no-op.
6. **Defer connectors:** the first new connector must be pulled by a committed pilot.
7. **Make the benchmark public enough to be credible:** same host/model, fixed tasks, hidden rubrics, all regressions reported.
8. **Keep enforcement separate:** context first; deterministic action policy later.
9. **Use human-approved promotion:** never silently learn organizational rules from transcripts.
10. **Start selling before broadening:** recruit three design partners as soon as the real Codex acceptance path works.

## The next ten working days

| Day | Deliverable |
|---:|---|
| 1 | Manual Codex end-to-end acceptance transcript and recorded configuration |
| 2 | `ContextBrief` 1.1 design decision and migration plan |
| 3 | Authority/scope/freshness/export fields plus deterministic no-op reasons |
| 4 | Receipt hash and metadata-only event schema |
| 5 | Twelve-task benchmark with hidden rubrics and fixed starting states |
| 6 | Baseline Codex runs and failure classification |
| 7 | Othie-assisted Codex runs and comparison report |
| 8 | Claude Code `UserPromptSubmit` prototype using Othie MCP |
| 9 | Shared Codex/Claude golden tests plus prompt-injection and revocation cases |
| 10 | Design-partner packet: one-page pitch, data-flow diagram, pilot scope, qualification questions, and benchmark excerpt |

At the end of day ten, the company should be able to show a buyer—not merely tell them—that the same coding agent made a better organizational decision because Othie delivered a small, authorized brief before it acted.

## Sources

[^1]: Glean, [“Context engineering AI: The foundation of reliable, high-performing models”](https://www.glean.com/blog/context-engineering-ai-the-foundation-of-reliable-high-performing-models), describing its enterprise graph, permissions-aware context, hybrid retrieval, and APIs.
[^2]: Atlassian, [Rovo Studio](https://www.atlassian.com/software/rovo/studio) and [Rovo admin guide](https://www.atlassian.com/software/rovo/guides/admin-guide/how-rovo-helps-your-teams), describing search, chat, agents, and Teamwork Graph integration.
[^3]: Microsoft, [Microsoft 365 Copilot connector prerequisites](https://learn.microsoft.com/en-us/microsoft-365/copilot/connectors/prerequisites), describing synced and federated connectors, identity, and administrative requirements.
[^4]: Microsoft Learn, [Agentic retrieval in Azure AI Search](https://learn.microsoft.com/en-us/azure/search/search-get-started-agentic-retrieval), describing query decomposition, parallel retrieval, reranking, and cited responses.
[^5]: Othie, [Current verification record](verification.md), including the recorded automated test status and remaining manual-host gaps.
[^6]: Cursor, [Hooks documentation](https://prod.cursor.com/docs/hooks), documenting current event inputs and outputs, including the differing capabilities of `beforeSubmitPrompt`, `sessionStart`, and post-tool events.
[^7]: Microsoft Research, [“CI-Work: Benchmarking Contextual Integrity in Enterprise LLM Agents”](https://www.microsoft.com/en-us/research/publication/ci-work-benchmarking-contextual-integrity-in-enterprise-llm-agents/), reporting enterprise-context privacy violations and limits of model-centric mitigation.
[^8]: Liu et al., [“Lost in the Middle: How Language Models Use Long Contexts”](https://arxiv.org/abs/2307.03172), showing sensitivity to the position of relevant information in long inputs.
[^9]: Hsieh et al., [“RULER: What’s the Real Context Size of Your Long-Context Language Models?”](https://arxiv.org/abs/2404.06654), evaluating effective long-context performance as length and task complexity increase.
[^10]: METR, [“Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity”](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/), a randomized study of experienced developers on familiar repositories.
[^11]: OpenAI, [Hooks documentation](https://learn.chatgpt.com/docs/hooks), documenting `UserPromptSubmit`, `SessionStart`, context injection, trust, limits, and managed hooks.
[^12]: Anthropic, [Claude Code hooks reference](https://code.claude.com/docs/en/hooks), documenting `UserPromptSubmit`, `additionalContext`, MCP tool hooks, and lifecycle events.
[^13]: GitHub, [About GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory), describing repository facts, code citations, revalidation, preferences, scope, and retention.
[^14]: LangChain, [Long-term memory](https://docs.langchain.com/oss/python/langchain/long-term-memory) and [memory concepts](https://docs.langchain.com/oss/python/concepts/memory), describing thread-scoped and cross-thread memory patterns.
[^15]: Letta, [TypeScript API overview](https://docs.letta.com/api/typescript), describing persistent stateful agents and editable memory blocks.
[^16]: Microsoft Research, [“AgenticRAG: Agentic Retrieval Augmented Generation for Enterprise Knowledge Bases”](https://www.microsoft.com/en-us/research/publication/agenticrag-agentic-retrieval-for-enterprise-knowledge-bases/), evaluating iterative search and evidence workflows over enterprise knowledge.
[^17]: Model Context Protocol, [“Using Server Instructions”](https://blog.modelcontextprotocol.io/posts/2025-11-03-using-server-instructions/), explaining that host behavior varies and instructions should not be treated as an enforcement boundary.
[^18]: OpenAI, [Company Knowledge in ChatGPT](https://help.openai.com/en/articles/12628342), describing supported plans, source permissions, citations, app access, and custom MCP participation.
[^19]: OpenAI, [Developer mode and custom MCP apps](https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta.eot), describing custom MCP deployment, administration, authentication, and private/local connection constraints.
[^20]: OpenAI, [ChatGPT Work local security](https://learn.chatgpt.com/fr-FR/docs/enterprise/chatgpt-work-local-security), describing local access and the distinction between local execution and offline inference.
[^21]: OpenAI, [ChatGPT Work cloud security](https://learn.chatgpt.com/zh-Hans/docs/enterprise/chatgpt-work-cloud-security), describing cloud execution and separation from local machine access.
[^22]: OpenAI, [Plugins documentation](https://learn.chatgpt.com/docs/plugins), describing plugin packaging across supported Chat, Work, and Codex surfaces and runtime requirements for hooks.
[^23]: GitHub, [Configuring MCP servers for GitHub Copilot coding agent](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers), documenting current cloud-agent MCP behavior and constraints.
[^24]: Model Context Protocol, [Authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization), covering OAuth-based authorization, PKCE, token audience, and token-passthrough risks.
[^25]: OWASP GenAI Security Project, [Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), covering direct and indirect prompt injection and limits of retrieval or fine-tuning as complete mitigations.
[^26]: Cursor, [Enterprise security hardening](https://prod.cursor.com/docs/enterprise/security-hardening), distinguishing model steering from deterministic controls including approvals, hooks, and sandboxing.
[^27]: NIST, [Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence), covering provenance, measurement, human domain knowledge, and generative-AI risk controls.

