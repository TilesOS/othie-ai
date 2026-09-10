# Othie AI website — fresh-chat build brief

Prepared September 10, 2026. This is the implementation handoff for a new chat. Build the website described here; the desktop installer is a separate workstream with a defined interface to the site.

## 1. Objective and established decisions

Build a polished, responsive marketing and download website for Othie AI. The three primary pages are the landing page, pricing page, and download page. A visitor should understand the product, see how it works, and find the appropriate desktop build without reading technical setup instructions first.

- Company and website brand: **Othie AI**.
- Product name in descriptions, screenshots, download buttons, and setup: **Othie**.
- Visual authority: closely follow **https://terax.app** and **https://github.com/crynta/Terax-website**. This direction is already chosen; do not reopen a broad aesthetic selection exercise.
- Base: dark, almost monochrome, with an emerald/teal accent used sparingly. The accent must be replaceable centrally.
- Audience: developers, founders, and knowledge workers using AI applications who repeatedly explain their preferences, working context, and organizational rules.
- Intended conversion: get the appropriate Othie desktop installer; until real installers exist, show their actual availability and provide the existing developer setup instructions.
- Current product repository: `/Users/tylermcclure/Documents/othie-ai`.
- Current product remote: `https://github.com/TilesOS/othie-ai`.
- The user will work on the custom model separately. Do not train a model as part of this task.

Build in the existing `apps/website/` npm workspace, with its own package manifest and TypeScript/framework configuration and the shared root `package-lock.json`. Install dependencies from the repository root using `npm install <dependency> --workspace=@othie/website`. Preserve `packages/engine`, `apps/desktop`, `packages/contracts`, `models`, and existing uncommitted work. Do not create a nested lockfile, initialize another Git repository, or create/publish a new GitHub repository. The website can build and deploy independently from this monorepo.

## 2. Product truth and message

Othie is a local context engine that indexes selected documents, retrieves relevant material, and supplies cited organizational rules and permitted excerpts to compatible AI applications through MCP. Local models can support semantic retrieval, extraction, and optional synthesis. Keyword retrieval remains available when the local model is unavailable.

Suggested headline: **Your AI, familiar with your work.**

Suggested supporting copy: **Othie brings your documents, preferences, and working rules into the AI tools you already use—with local processing and control over what you share.**

Use outcome-oriented language on the homepage. Introduce MCP in the compatibility section and FAQ, where explaining it helps someone decide whether Othie fits their tools.

Read `packages/engine/README.md` and `docs/verification.md` before finalizing factual copy. As of this brief:

- The implementation is a single-user local engine, with configuration generation for Claude Desktop, Cursor, and VS Code. Native-host compatibility and Windows release readiness still require verification.
- `host-config` prints configuration; it does not install integrations automatically.
- There is no completed graphical desktop setup wizard or established public installer release in the inspected checkout.
- A connected host decides when to call the tool and how to use returned context. Configuring MCP does not guarantee automatic injection into every prompt.
- Processing can be local while the host sends returned context to its cloud model. Remote engine providers also require their own explicit configuration and authorization.
- Connecting Othie to an AI host does not grant Othie access to that host's conversations, other tools, or third-party data.
- Do not claim that Othie remembers every conversation, supports every AI app, guarantees latency, has application-managed encryption, or is enterprise/compliance certified.
- Do not invent customer logos, testimonials, adoption numbers, benchmarks, model sizes, prices, or security certifications.

Communicate the relevant privacy boundary in plain language: **You choose what Othie can read. Connected AI apps may send the context they receive to their model provider.**

## 3. Reference audit: what to borrow

I inspected the live Terax page, rendered it in a browser, and read the following repository files. Reinspect them when implementation starts, because the reference can change.

| Reference | What it contributes to Othie |
| --- | --- |
| [Terax hero](https://github.com/crynta/Terax-website/blob/main/components/site/hero.tsx) | Centered two-line headline, muted/bright hierarchy, compact status badge, concise subhead, pill-shaped primary and secondary actions. |
| [Terax header](https://github.com/crynta/Terax-website/blob/main/components/site/header-shell.tsx) | Restrained navigation and a compact floating treatment after scrolling. Add a proper mobile menu for Othie's routes. |
| [Terax theme](https://github.com/crynta/Terax-website/blob/main/app/globals.css) and [layout](https://github.com/crynta/Terax-website/blob/main/app/layout.tsx) | Cool near-black surfaces, subtle borders, Inter typography and Geist Mono labels. Use these fonts deliberately to match the selected reference. |
| [Terax section primitives](https://github.com/crynta/Terax-website/blob/main/components/site/section.tsx) and [feature showcases](https://github.com/crynta/Terax-website/blob/main/components/site/feature-showcase.tsx) | Generous vertical rhythm, small numbered labels, large interface demonstrations, alternating text/image sections. |
| [Background wrapper](https://github.com/crynta/Terax-website/blob/main/components/site/background-waves.tsx) and [line-wave shader](https://github.com/crynta/Terax-website/blob/main/components/line-waves.tsx) | Actual flowing WebGL lines using OGL, with a vignette. Retain the visual character while reducing distraction behind copy. |
| [Terax download presentation](https://github.com/crynta/Terax-website/blob/main/components/site/download.tsx) and [site configuration](https://github.com/crynta/Terax-website/blob/main/lib/site.ts) | Clear recommended download plus visible alternatives; central release/link metadata. |
| [Linear](https://linear.app/) | Secondary reference for concise hierarchy, typography, negative space, and product-led storytelling. |
| [Raycast](https://www.raycast.com/) | Secondary reference for presenting a desktop product and making the download action unmistakable. |

Terax should remain the dominant influence. Do not mix three competing visual systems or import Terax's terminal-specific claims and screenshots into Othie.

The reference repository uses [Apache 2.0](https://github.com/crynta/Terax-website/blob/main/LICENSE). If adapting its code, retain applicable notices, include the license, identify modified files, and record the upstream source and revision in a third-party attribution file. Check assets separately. Create Othie's own wordmark, illustrations, demo content, and copy; do not reuse Terax's identity. Reference: [Apache license terms](https://www.apache.org/licenses/LICENSE-2.0).

### Improvements over the reference implementation

- Its [platform detector](https://github.com/crynta/Terax-website/blob/main/components/site/platform-detect.ts) classifies iPhone/iPad as Mac; do not copy that behavior.
- Its hero/download selection defaults unknown platforms to a Mac build. Othie should offer a neutral chooser until it knows enough to recommend one.
- Its layout imports website analytics. Decide Othie's analytics separately; do not inherit tracking integrations as an accidental dependency.
- Use route-correct download links (`/download`), rather than a homepage-only anchor that fails from other pages.

## 4. Visual system

### Composition

Keep the Terax-like centered hero, atmospheric diagonal line field, tight headline tracking, understated pill controls, and generous section spacing. Use broad showcases for explaining Othie; reserve cards for information that benefits from comparison, such as downloads and pricing.

The first viewport contains a restrained header, small availability label, two-line headline, short supporting paragraph, primary action, secondary demo link, and compact supported-platform text. The top edge of a meaningful product illustration should be visible around the fold on a typical laptop, rather than making the entire viewport decorative.

### Color and typography

Provisional starting palette:

| Token | Starting value | Purpose |
| --- | --- | --- |
| `--background` | `#090D0F` | Page canvas |
| `--surface` | `#11171A` | Raised panels |
| `--foreground` | `#F4F7F6` | Main text |
| `--muted-foreground` | `#A2AEAA` | Supporting copy |
| `--brand-accent` | `#2DD4BF` | Teal leaning toward emerald |
| `--on-accent` | `#062923` | Text on accent buttons |

Derive hover, focus, selected, and soft accent treatments from the central accent token. Map them through semantic component tokens. Keep the generic shadcn `accent` surface role distinct from the brand accent so neutral hover surfaces do not all become green. Any shader tint must consume the same brand source, not an independent hardcoded color.

Aim for roughly 90–95% neutral visual area. Accent belongs primarily on the main download action, a selected control, a small badge detail, and selected lines in the demonstration. Keep headings and most icons white/gray. No large green panels, rainbow gradients, pervasive luminous borders, or accent-colored body paragraphs.

Use Inter for interface and display copy and Geist Mono for small labels and factual metadata, following Terax. Start around 56–72px desktop and 36–44px mobile hero type, with 16–18px body copy. Use approximately 1120–1200px primary content widths, with controlled wider product showcases. These are starting constraints, to be tuned against the rendered reference.

Keep the initial site dark-only. A public theme or accent picker is not necessary; developer configurability is. Verify a temporary accent swap changes all intended brand treatments without component edits, then restore teal and recheck contrast. Status colors remain semantic and independent of the brand.

### Motion

Adapt the real OGL wave technique where appropriate. Lazy-load decorative rendering; cap device pixel ratio; suspend animation when hidden or outside its intended region; clean up graphics resources. Provide a static fallback for reduced motion, unavailable WebGL, and context loss. Content and calls to action must render before the animation and remain usable if it fails.

Use short, restrained entrance transitions and hover changes. Keep the principal headline stable. A looping typewriter headline is optional and should not be used if it makes the value proposition harder to read. Mobile should retain the composition with simpler motion, not shrink the desktop canvas indiscriminately.

## 5. Pages and content

### Landing page `/`

1. **Header:** Othie AI wordmark, Product anchor, Pricing, Download, and a primary Get Othie action. Include a usable mobile menu with keyboard focus management.
2. **Hero:** headline and supporting copy above. Main action goes to `/download`; secondary action goes to the on-page demonstration. Release-state text must come from configuration.
3. **Product demonstration:** show the relationship between selected source documents, a compact context result with citations, and an AI app using it. Use a clearly labeled illustrative example, not a screenshot implying an unbuilt dashboard is already shipping.
4. **Three substantial feature showcases:** choose the context; carry preferences and constraints into compatible tools; control how much context is shared. Each combines a short benefit statement with a concrete illustration.
5. **Compatibility:** Claude Desktop, Cursor, and VS Code with accurate verification status. Explain that the app may request trust/approval and that host behavior varies. Do not present a list of untested apps as supported.
6. **How setup will work:** download, choose local sources and model, connect selected AI apps. Label planned guided setup accordingly until its release is ready.
7. **Privacy:** a concise explanation of local processing, selected folders, permitted export, and the host/model-provider boundary. Link to the detailed privacy page.
8. **FAQ:** local models, offline keyword fallback, supported files, where data goes, compatible apps, whether context is used automatically, and installer availability.
9. **Final action and footer:** one clear conversion, pricing/download links, setup help, privacy, and only verified repository/contact links.

Signature demo example: a fictional `Writing guide.md` specifies direct language, and `Support policy.md` states a four-hour weekday response target. A sample request for a support reply produces a small cited context pack. Switching between two supplied example queries changes which facts appear; a context-size control shows whole items fitting into a budget. Label all source material illustrative. If token counts are shown, calculate them under a named tokenizer or mark them estimates; do not animate invented performance numbers. This is a deterministic browser demo, not a live model call or a document upload.

### Pricing page `/pricing`

Build a complete, deliberate page, not a heading with three empty cards. It should explain the commercial offer once defined and answer questions about the optional local model, provider costs, updates, and individual versus team use.

Pricing and entitlements have not been decided. Keep the presentation data-driven, with an explicit unpublished state. Until approved prices exist, use an honest availability message such as “Pricing will be announced with the public release,” alongside product scope, FAQs, and links to download status/setup information. Do not infer that beta access is free, invent monthly discounts, or advertise unsupported enterprise features.

Plan cards and a billing-period switch should render only when there are actual configured offers. A paid CTA must point to a real configured destination; do not create pretend checkout success screens. Stripe, subscriptions, accounts, and license enforcement are outside this initial website build unless separately authorized and specified.

### Download page `/download`

- Best-effort OS recommendation after hydration; always keep manual platform selection visible. Initial server-rendered state is neutral and usable.
- Known initial desktop targets: macOS Apple Silicon and Windows x64. Publish them as available only when tested release artifacts exist. Do not promise Intel Mac, Windows ARM, Linux, or mobile builds.
- Treat device architecture as unknown unless reliably established. Never assume that a Mac user-agent string proves Apple Silicon or Intel. Label the offered architecture and link to instructions for checking it.
- Handle iOS/iPadOS, Android, Linux, ChromeOS, unknown, blocked detection, and JavaScript-disabled visitors gracefully. Unsupported devices can read desktop requirements and select a build manually.
- Never trigger a download merely because a page loads. The user clicks an explicitly labeled action.
- Show actual version, release date, OS/architecture, requirements, file size, and checksum/release notes when provided by release metadata.
- Distinguish the app download from the optional model download. Model size and requirements remain pending until the model is defined.
- Include a concise “After downloading” guide and troubleshooting for unsupported hardware, unavailable builds, and host restart/approval steps.
- Do not say “installed” or “ready” after a browser download click: the website cannot verify completion of native setup.
- Missing or withdrawn artifacts produce an informative unavailable state with a useful next action, such as current developer setup instructions. No fake `.dmg`/`.exe` links or fabricated versions.

Use a validated release manifest as the single source of truth: per-platform availability, version, architecture, minimum OS, artifact URL, byte size, SHA-256, release notes URL, and separately verified signing/notarization status. Missing required release information should fail closed for that download. Keep model artifacts in separate metadata. Use ordinary release links; do not stream large installers through the website's application server.

Platform detection is advisory. Browser identification is imperfect; see [MDN's guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Browser_detection_using_the_user_agent).

### Supporting content

Include `/privacy` and `/docs/setup` with verified implementation facts. Add legal/contact routes when their owner details and policies are provided; record missing production inputs rather than publishing invented terms. Ensure every visible footer link has a real destination. Do not build a blog, account dashboard, or large documentation system for this first release.

## 6. Native setup contract — a separate workstream

The website recommends and delivers the installer. Installed-app discovery, local permissions, model management, and MCP configuration happen in the downloaded desktop application. Do not attempt to scan the visitor's installed apps, probe localhost, or modify AI host configuration from the marketing site.

The intended native wizard is:

1. **Welcome and system check:** confirm supported OS/architecture and available storage; explain what installation will do.
2. **Model choice:** download the Othie model when published, use a compatible existing local model/runtime, or continue with the documented limited mode. Show real size, resource requirements, progress, cancellation, resume/retry, and checksum verification.
3. **Source permissions:** the user explicitly chooses folders. Explain exclusions and the consequences of sharing context. Tool/cloud data connectors, if added later, require separate scoped authorization; they are not implied by installing MCP.
4. **App selection:** detect known supported AI apps locally. As requested, preselect detected, supported apps in a visible checklist; allow deselecting any or all. Undetected or unsupported apps are not silently configured. Checking an app is separate from authorizing sources or cloud providers.
5. **Review and configure:** show the selected apps and scope, then a clear Configure selected apps action. Use a separate credential per host, merge configuration safely, preserve unrelated entries, back up changes, and make repeated setup idempotent.
6. **Verification:** display each app as connected, needs approval, needs restart, or failed. Explain host trust prompts honestly. Test the engine and bridge before reporting them ready; host tool availability and automatic usage are different things.
7. **Finish:** show local engine/model/index status and a usable first example. Background indexing may continue after setup; do not equate installation success with a fully indexed corpus. Support changing settings, disconnecting apps, and uninstalling later.

The current website task includes the explanation of this journey and the metadata it needs, not the implementation of native installers, model hosting, auto-updates, signing, or app-specific configuration writers. Those must be completed and tested before the site advertises automatic setup as available.

## 7. Suggested implementation structure

Use Next.js App Router, TypeScript, Tailwind CSS, accessible UI primitives, and Motion. OGL is justified for the selected reference effect. Use current compatible stable package versions at build time; do not copy the reference's entire dependency list or its docs/search system. Prefer static/server-rendered content, with small client components for the demo, navigation, and download recommendation.

Suggested modules:

- `app/`: landing, pricing, download, privacy, and setup routes with shared layout and metadata.
- `components/site/`: header, footer, hero, background, context demo, feature showcase, compatibility, FAQs, pricing presentation, and download chooser.
- `components/ui/`: only the needed accessible primitives.
- `lib/site.ts`: brand names, site URL, navigation, verified contact/repository links, and release-stage flags.
- `lib/releases.ts`: typed release/model manifests and validation.
- `lib/pricing.ts`: optional offers and unpublished pricing state.
- `lib/platform.ts`: pure detection/recommendation logic with explicit unknown and unsupported outcomes.
- `styles/tokens.css`: neutral and brand tokens; one accent source.
- `content/`: copy and setup material separated from layout.
- `THIRD_PARTY_NOTICES.md`: adapted sources and attribution.

No database, authentication, payment integration, AI API key, document upload, or remote inference is necessary for the initial marketing site. Keep documents and engine credentials entirely outside the web app. Do not include the root project's environment files in web bundles or deployment configuration.

Provide metadata, original social preview imagery, favicon, sitemap, robots policy, meaningful page titles, semantic markup, and correct canonical URLs. The production domain has not been selected; configure it centrally. Private previews should not be indexed. Analytics is off by default; any future analytics should be an explicit decision with accurate disclosure.

## 8. Build sequence and completion criteria

1. **Inspect and establish:** read the target repository instructions and current engine docs; inspect Terax's relevant source and live desktop/mobile layouts; record the chosen design and product facts. Preserve the pinned visual direction.
2. **Build the shared system:** page shell, tokens, typography, header/mobile navigation, footer, controls, and responsive rules.
3. **Build the landing story:** hero, Othie-specific demonstration, feature showcases, privacy explanation, FAQ, and compatibility states. Establish desktop and mobile composition before adding motion.
4. **Complete pricing and downloads:** central data, unpublished states, release recommendation, manual override, setup help, and useful unavailable states.
5. **Add motion and polish:** adapt the waves, refine transitions, improve imagery and spacing, and retain robust fallbacks.
6. **Verify and hand over:** run the production build, typecheck/lint, meaningful interaction tests, and visual review. Provide screenshots and a short list of unresolved launch inputs.

Acceptance checks:

- All primary pages work at 390px, 768px, 1440px, and a wide desktop viewport; no clipped navigation or horizontal overflow.
- Page actions, cross-page anchors, mobile navigation, FAQs, and the demo work with keyboard and touch.
- Primary actions and text have adequate contrast; focus is visible; zoom and reduced motion work. Aim for WCAG 2.2 AA and test it rather than claiming certification.
- Essential content and manual downloads remain usable without JavaScript or WebGL.
- Detection cases include Mac, Windows, iPhone, iPad with desktop-like UA, Android, Linux, ChromeOS, and unknown. Unknown architecture never receives a confident compatibility claim.
- Manifest tests cover available, unavailable, incomplete, and withdrawn releases; unavailable builds never create active artifact links.
- The accent can change centrally, including any tinted illustration/shader details, without hunting through JSX.
- No reference-brand text, icons, product screenshots, release URLs, analytics, or factual claims remain accidentally copied into Othie.
- Check the built page for console errors, network failures, layout shift, image/font loading, and unnecessary animation work. Use Lighthouse as a diagnostic with recorded conditions, not an unsupported performance promise.
- Show the user a working preview and report exactly what is functional, illustrative, and awaiting release metadata. Follow the environment's hosting instructions if deploying; do not assume a production domain or publish unreviewed commercial facts.

## 9. Open launch inputs — continue building around them

These do not block layout or implementation. Represent unknowns explicitly in configuration and ask for them before they are needed for a real launch:

- Production domain and company/contact details.
- Actual prices, plan names, entitlements, billing model, and destination for paid actions.
- Signed/tested installer artifacts and confirmed operating-system requirements.
- Custom model identity, license, artifact URL, size, and hardware requirements.
- Verified host support matrix and availability of the graphical setup wizard.
- Final logo, actual product screenshots, and any approved customer evidence.

The design direction, company/product naming, three primary pages, restrained accent, and intended native app-selection behavior are already settled.

## Paste into the fresh chat

Build the Othie AI website in the existing `apps/website` npm workspace from `docs/website-build-plan.md`, using the shared root lockfile. Use Terax.app and the `crynta/Terax-website` repository as the dominant visual reference, with a dark neutral base and a sparse, centrally configurable emerald/teal accent. Build the landing, pricing, and download pages, plus the supporting privacy/setup content described in the brief. Othie is the product and Othie AI is the company/website brand. Inspect the current repository first and preserve the engine. Implement and verify the website; keep native installer/model work in its separate scope, and represent unknown pricing or unavailable downloads honestly. Proceed with the established design decisions rather than restarting discovery.
