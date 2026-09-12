/**
 * THESIS: Make local context visible as a cited signal, not a generic AI landing page.
 * OWN-WORLD: Pure-black planes, hairline rules, two-tone paragraph headings, and a rare green signal.
 * STORY: Select trusted documents, retrieve only relevant facts, then let a compatible host use them.
 * FIRST VIEWPORT: Announcement rail; a vertical light field; a left-set promise, two actions, then the primitives.
 * FORM: Neon-style left-aligned narrative staged around an original document-to-context mechanism.
 */
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BackgroundWaves } from "@/components/site/background-waves";
import { CommandBlock } from "@/components/site/command-block";
import { ContextDemo } from "@/components/site/context-demo";
import { HomeSections } from "@/components/site/home-sections";
import { siteConfig } from "@/lib/site";
import "./extended.css";

const primitives = [
  {
    term: "Local index",
    body: "Selected folders only. Othie resolves real paths and excludes sensitive ones by default.",
    visual: (
      <>
        <span className="is-live"><i />/work/policies<em>14</em></span>
        <span className="is-live"><i />/work/guides<em>6</em></span>
        <span><i />/work/.env<em>skipped</em></span>
        <div className="primitive-bar primitive-bar--fill" style={{ width: "72%" }} />
        <div className="primitive-bar" style={{ width: "44%" }} />
      </>
    ),
  },
  {
    term: "Cited retrieval",
    body: "Every rule or excerpt comes back with the source it was read from.",
    visual: (
      <>
        <div className="primitive-bar" style={{ width: "88%" }} />
        <div className="primitive-bar" style={{ width: "64%" }} />
        <span className="is-live"><i />tone-of-voice.md:12</span>
        <div className="primitive-bar" style={{ width: "76%" }} />
        <span className="is-live"><i />review-policy.md:4</span>
      </>
    ),
  },
  {
    term: "Context budget",
    body: "A hard token cap, packed with whole facts rather than truncated ones.",
    visual: (
      <>
        <span><i />budget<em>500</em></span>
        <div className="primitive-bar primitive-bar--fill" style={{ width: "84%" }} />
        <div className="primitive-bar primitive-bar--fill" style={{ width: "62%" }} />
        <div className="primitive-bar primitive-bar--fill" style={{ width: "41%" }} />
        <div className="primitive-bar" style={{ width: "27%" }} />
      </>
    ),
  },
  {
    term: "Per-host grants",
    body: "Each connected app gets its own credential and its own profile grant.",
    visual: (
      <>
        <span className="is-live"><i />bridge/claude<em>granted</em></span>
        <span className="is-live"><i />bridge/cursor<em>granted</em></span>
        <span><i />bridge/vscode<em>granted</em></span>
        <div className="primitive-bar" style={{ width: "55%" }} />
      </>
    ),
  },
  {
    term: "MCP bridge",
    body: "Configuration Othie prints for Claude Desktop, Cursor, and VS Code.",
    visual: (
      <>
        <span><i />get_organization_context</span>
        <span><i />get_context_status</span>
        <div className="primitive-bar" style={{ width: "68%" }} />
        <span className="is-live"><i />tools available</span>
      </>
    ),
  },
];

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <BackgroundWaves />
        <div className="hero-inner">
          <span className="mono-label hero-eyebrow">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor"><rect x="0" y="0" width="3" height="12" /><rect x="4.5" y="3" width="3" height="9" /><rect x="9" y="6" width="3" height="6" /></svg>
            Runs locally on your machine
          </span>
          <h1 id="hero-title">Your AI, familiar with your work, <span>without handing over the archive.</span></h1>
          <p>Othie brings selected documents, preferences, and working rules into compatible AI tools — indexed locally, returned with citations, and bounded by a budget you set.</p>
          <div className="hero-actions">
            <Link className="button button--primary button--large" href="/download">Get started</Link>
            <Link className="button button--secondary button--large" href="/docs/setup">Read the docs</Link>
          </div>
        </div>
      </section>

      <section className="primitives" aria-label="Othie primitives">
        <div className="primitive-grid">
          {primitives.map((primitive) => (
            <div className="primitive" key={primitive.term}>
              <p><b>{primitive.term}.</b> {primitive.body}</p>
              <div className="primitive-visual" aria-hidden="true">{primitive.visual}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="demo-section" id="product" aria-labelledby="product-title">
        <div className="section-intro">
          <span className="section-label">The context signal</span>
          <h2 id="product-title"><b>The right pieces of your work, packed with their sources.</b> Othie retrieves whole facts that fit the request and a bounded context budget.</h2>
        </div>
        <ContextDemo />
      </section>

      <section className="command-band" aria-labelledby="command-title">
        <div>
          <span className="section-label">Start locally</span>
          <h2 id="command-title"><b>Try it for yourself.</b> Build the workspaces, then initialise a local configuration.</h2>
        </div>
        <div>
          <CommandBlock command="npm run engine -- init --config config.json" />
          <p style={{ margin: "0.85rem 0 0", color: "var(--quiet-foreground)", fontSize: "0.78rem" }}>
            Requires Node.js {siteConfig.nodeVersion} and a repository checkout. <Link className="text-link" href="/docs/setup" style={{ marginTop: 0 }}>Full setup <ArrowRight size={13} /></Link>
          </p>
        </div>
      </section>

      <HomeSections />

    </main>
  );
}

