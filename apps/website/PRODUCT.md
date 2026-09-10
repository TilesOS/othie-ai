# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers, founders, and knowledge workers who use AI applications and repeatedly need to explain their preferences, current working context, and organizational rules.

## Product Purpose

Othie is a single-user local context engine. It indexes documents the user selects, retrieves relevant material, and supplies cited rules and permitted excerpts to compatible AI applications through MCP. The website helps a visitor understand that boundary, evaluate compatibility, and obtain the appropriate desktop build once a verified release exists.

## Positioning

Othie turns user-selected working documents into bounded, cited context packs for compatible AI tools. By retrieving relevant whole facts under a configurable token cap, it helps teams preserve a finite model context window for code, conversation history, tool results, and later steps. This can reduce input-token overhead and, for genuinely large prompts, prompt-processing time; exact gains depend on the connected host, model, and caching behavior. Its core distinction is local control over source selection, retrieval, and export rather than a claim to remember every conversation or automatically inject context into every prompt.

## Operating Context

Othie runs as a local engine on macOS Apple Silicon and Windows x64. A connected MCP host such as Claude Desktop, Cursor, or VS Code decides when to call Othie and how to use the returned context. Processing may remain local, while a host can send returned text to its cloud model provider.

## Capabilities and Constraints

- Supports Markdown, plain text, text-based PDF, and DOCX sources. OCR, encrypted PDFs, Linux, Windows ARM, and Intel Mac releases are outside the current verified scope.
- Local models can support semantic retrieval, extraction, and optional synthesis. Keyword retrieval remains available when a model/provider is unavailable.
- `host-config` prints host configuration; it does not install integrations automatically.
- Othie does not receive access to a host's conversations, other tools, or unrelated third-party data merely by being connected through MCP.
- Pricing, entitlements, public installers, model artifacts, production domain, company contact details, and the graphical setup wizard remain open launch inputs. The website must fail closed around missing release metadata and must not invent commercial or release claims.

## Brand Commitments

The company and website brand is **Othie AI**; the product is **Othie**. Copy is direct, outcome-oriented, specific, and restrained. The public experience is dark, nearly monochrome, and uses a sparse centrally configurable emerald/teal accent. Terax is the dominant visual authority, with Linear and Raycast serving only as secondary craft references.

## Evidence on Hand

- Product and engine facts: `../../packages/engine/README.md`
- Current verification status: `../../docs/verification.md`
- Website implementation brief: `../../docs/website-build-plan.md`
- Source repository: `https://github.com/TilesOS/othie-ai`
- No approved customer proof, prices, public installer artifacts, production domain, final logo, product screenshots, or model release metadata is currently supplied.

## Product Principles

- Make the privacy boundary legible: users choose what Othie reads, and connected apps may send returned context to their providers.
- Demonstrate the context mechanism with cited, clearly illustrative material rather than unsupported product screenshots.
- Treat compatibility, pricing, and releases as verified configuration rather than marketing copy.
- Keep native setup, model distribution, app discovery, and host configuration inside the desktop workstream.

## Accessibility & Inclusion

Aim for WCAG 2.2 AA. Preserve keyboard and touch operation, visible focus, reduced-motion fallbacks, 200% text enlargement, and a useful non-JavaScript/non-WebGL path for essential content and manual download status.
