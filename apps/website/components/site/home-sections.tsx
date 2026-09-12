import { ArrowRight, Check, Cloud, FileCheck2, FolderLock, Gauge, Route, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Faq, type FaqItem } from "./faq";
import { SectionRail } from "./section-rail";
import { SignalMotion } from "./signal-motion";

const homeFaqs: FaqItem[] = [
  { question: "Does Othie require a local model?", answer: "No. Keyword retrieval remains available when the configured local model or provider is unavailable. A compatible local model can add semantic retrieval, extraction, and optional synthesis once it is configured." },
  { question: "Which files can Othie read?", answer: "The current engine accepts Markdown, plain text, text-based PDF, and DOCX files from folders you explicitly configure. OCR, encrypted PDFs, malformed inputs, and oversized files are reported instead of guessed at." },
  { question: "Where does my data go?", answer: "Othie indexes selected sources locally and only returns permitted, cited context to a connected host. That host may send the returned text to its own cloud model provider, so local processing does not automatically make the entire workflow local." },
  { question: "Which AI apps are compatible?", answer: "Othie can generate configuration for Claude Desktop, Cursor, and VS Code. Their MCP configuration and tool-calling behavior change independently, and native-host verification is still a release gate." },
  { question: "Is context added to every prompt automatically?", answer: "No. The connected host decides whether to call Othie and how to use the result. MCP configuration makes the tool available; it does not guarantee automatic use for every prompt." },
  { question: "Are desktop installers available?", answer: "Not yet. No verified public installer is present in the current release manifest. The download page stays honest about that status and links to the existing developer setup." },
];

const railItems = [
  { id: "choose", label: "Choose sources" },
  { id: "carry", label: "Carry context" },
  { id: "preserve", label: "Preserve the window" },
];

export function HomeSections() {
  return (
    <>
      <section className="story-section" id="sources" aria-labelledby="features-title">
        <div className="story-heading">
          <span className="section-label">A controlled path</span>
          <h2 id="features-title"><b>Context that starts with your sources and ends at your boundary.</b> Selection, retrieval, and the token budget all stay visible.</h2>
        </div>

        <div className="story-layout">
          <SectionRail items={railItems} label="Mechanism" />

          <div>
            <article className="feature-showcase" id="choose">
              <div className="feature-copy">
                <span className="mono-label">01 — Choose</span>
                <h3><b>Point Othie at the work that should count.</b> Nothing else is discovered for you.</h3>
                <p>You select source folders. Othie resolves real paths, excludes sensitive and generated paths by default, and keeps citations tied to the material it retrieves.</p>
                <ul className="check-list">
                  <li><Check size={15} /> Selected folders only</li>
                  <li><Check size={15} /> Markdown, text, PDF, and DOCX</li>
                  <li><Check size={15} /> Source-aware citations</li>
                </ul>
              </div>
              <div className="feature-visual source-scope-visual" aria-label="Illustrative source folder selection" role="img">
                <div className="visual-bar"><span>Source scope</span><span>Illustrative</span></div>
                <div className="folder-tree">
                  <div className="tree-root"><FolderLock size={17} /><span>Work context</span><small>selected</small></div>
                  <div className="tree-branch"><i /><FileCheck2 size={16} /><span>Policies</span><em>14 files</em></div>
                  <div className="tree-branch"><i /><FileCheck2 size={16} /><span>Writing guides</span><em>6 files</em></div>
                  <div className="tree-branch tree-branch--muted"><i /><FolderLock size={16} /><span>Credentials</span><em>excluded</em></div>
                </div>
                <div className="scope-foot"><ShieldCheck size={15} /> Hidden, generated, and credential-like paths excluded by default</div>
              </div>
            </article>

            <article className="feature-showcase feature-showcase--reverse" id="carry">
              <div className="feature-copy">
                <span className="mono-label">02 — Carry</span>
                <h3><b>Make preferences and constraints available where work happens.</b> One grant per host.</h3>
                <p>Each connected host gets its own credential and profile grant. When that host asks, Othie returns bounded organizational context instead of an open-ended memory dump.</p>
                <p className="feature-caveat">The host decides when to call Othie and how to use its response.</p>
              </div>
              <div className="feature-visual host-flow-visual" aria-label="Illustrative MCP host connections" role="img">
                <div className="visual-bar"><span>Host bridge</span><span>Tool available</span></div>
                <div className="host-flow-core"><span className="brand-mark" aria-hidden="true"><span /></span><strong>Othie</strong><small>local engine</small></div>
                <SignalMotion />
                <div className="host-row">
                  <span>Claude Desktop<small>config generated</small></span>
                  <span>Cursor<small>config generated</small></span>
                  <span>VS Code<small>config generated</small></span>
                </div>
              </div>
            </article>

            <article className="feature-showcase" id="preserve">
              <div className="feature-copy">
                <span className="mono-label">03 — Preserve</span>
                <h3><b>Spend the context window on the task, not the archive.</b> A hard cap, packed with whole items.</h3>
                <p>Large codebases and documentation sets can consume a model&apos;s finite context with material the task never uses. Othie returns a bounded set of relevant, cited facts, leaving more room for code, conversation history, tool results, and the work still ahead.</p>
                <ul className="check-list">
                  <li><Check size={15} /> Less irrelevant context in each request</li>
                  <li><Check size={15} /> More runway before compaction or truncation</li>
                  <li><Check size={15} /> A hard cap on Othie&apos;s returned tokens</li>
                </ul>
                <p className="feature-caveat">For genuinely large prompts, less input can also reduce prompt-processing time. Actual gains depend on the connected host, model, and caching behavior.</p>
                <Link className="text-link" href="/privacy">Read the privacy boundary <ArrowRight size={14} /></Link>
              </div>
              <div className="feature-visual budget-visual" aria-label="Illustrative context budget packing" role="img">
                <div className="visual-bar"><span>Context envelope</span><span>500 tokens max</span></div>
                <div className="budget-stack">
                  <div style={{ "--item-width": "88%" } as React.CSSProperties}><span>Rule + citation</span><em>148</em></div>
                  <div style={{ "--item-width": "72%" } as React.CSSProperties}><span>Excerpt + citation</span><em>121</em></div>
                  <div style={{ "--item-width": "55%" } as React.CSSProperties}><span>Rule + qualifier</span><em>94</em></div>
                  <div className="budget-remainder" style={{ "--item-width": "31%" } as React.CSSProperties}><span>Available</span><em>137</em></div>
                </div>
                <div className="scope-foot"><Gauge size={15} /> Whole items fit deterministically; token counts include framing</div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="stat-band" aria-labelledby="stat-title">
        <div>
          <span className="section-label">Measured, not estimated</span>
          <h2 id="stat-title" className="lede"><b>Every number the engine reports is a real limit.</b> Nothing on this page describes a capability the release manifest cannot back.</h2>
          <p>Othie&apos;s retrieval is deterministic: a request either fits inside the configured envelope or is reported as trimmed. Counts include the framing Othie adds around each item.</p>
        </div>
        <div className="stat-figures">
          <div><strong>100%</strong><span>of returned rules and excerpts carry their source</span></div>
          <div><strong>500</strong><span>default token ceiling per response, configurable</span></div>
          <div><strong>4</strong><span>file types read today — MD, TXT, PDF, DOCX</span></div>
        </div>
      </section>

      <section className="compatibility-section" id="compatibility" aria-labelledby="compatibility-title">
        <div className="compatibility-copy">
          <span className="section-label">Compatibility</span>
          <h2 id="compatibility-title"><b>Built for the MCP hosts already in your workflow.</b> Othie prints the configuration; you merge it.</h2>
          <p>Othie prints the correct configuration shape for each known host. You merge it into the host, approve or trust the tool if asked, then verify it manually.</p>
          <Link className="button button--secondary" href="/docs/setup">Read current setup</Link>
        </div>
        <div className="compatibility-list" role="list">
          {[
            ["Claude Desktop", "Configuration available", "Native verification pending"],
            ["Cursor", "Configuration available", "Native verification pending"],
            ["VS Code", "Configuration available", "Native verification pending"],
          ].map(([name, state, note]) => (
            <div className="compatibility-row" role="listitem" key={name}>
              <span className="host-monogram">{name.slice(0, 2)}</span>
              <div><strong>{name}</strong><span>{state}</span></div>
              <small>{note}</small>
            </div>
          ))}
          <p className="compatibility-note">Compatibility means a host configuration can be generated. It does not mean every prompt automatically uses Othie.</p>
        </div>
      </section>

      <section className="setup-section" aria-labelledby="setup-title">
        <div className="section-intro">
          <span className="section-label">Planned guided setup</span>
          <h2 id="setup-title"><b>A careful setup flow, once the desktop release is ready.</b> Today, setup uses the developer workflow.</h2>
          <p>The planned desktop wizard keeps every important choice visible rather than deciding for you.</p>
        </div>
        <ol className="setup-timeline">
          {[
            ["01", "Download", "Choose a verified build for your operating system and architecture."],
            ["02", "Select sources", "Choose the folders Othie may read; nothing is discovered from the website."],
            ["03", "Choose a model", "Use the published Othie model, a compatible local provider, or documented limited mode."],
            ["04", "Connect apps", "Review detected, supported AI apps and configure only the ones you select."],
          ].map(([number, title, body]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}
        </ol>
        <Link className="text-link" href="/docs/setup">See what works today <ArrowRight size={14} /></Link>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-title">
        <div className="privacy-symbol" aria-hidden="true"><ShieldCheck /><span /></div>
        <div>
          <span className="section-label">The boundary, in plain language</span>
          <h2 id="privacy-title"><b>You choose what Othie can read.</b> Everything else stays where it is.</h2>
          <p>Othie processes selected documents and returns only permitted context. Connected AI apps may send the context they receive to their model provider.</p>
          <div className="privacy-facts">
            <span><FolderLock size={16} /> Selected folders define the source boundary</span>
            <span><Route size={16} /> Each host receives a separate credential</span>
            <span><Cloud size={16} /> Cloud use depends on the connected host and provider</span>
          </div>
          <Link className="button button--secondary" href="/privacy">Read the full privacy explanation</Link>
        </div>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <div>
          <span className="section-label">Questions, answered plainly</span>
          <h2 id="faq-title"><b>Before you connect Othie.</b></h2>
        </div>
        <Faq items={homeFaqs} />
      </section>

      <section className="final-cta" aria-labelledby="final-cta-title">
        <span className="section-label">Keep your working context close</span>
        <h2 id="final-cta-title"><b>Local context for the AI tools you already use.</b></h2>
        <p>See which Othie desktop builds are verified, or use the current developer setup while installers are in progress.</p>
        <div>
          <Link className="button button--primary button--large" href="/download">Check download status <ArrowRight size={16} /></Link>
          <Link className="button button--secondary button--large" href="/docs/setup">Developer setup</Link>
        </div>
      </section>
    </>
  );
}
