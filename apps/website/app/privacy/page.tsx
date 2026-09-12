import type { Metadata } from "next";
import { ArrowRight, EyeOff, FolderLock, KeyRound, Server, Share2 } from "lucide-react";
import Link from "next/link";
import "../extended.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Understand Othie’s local source boundary and what connected AI applications can receive.",
};

export default function PrivacyPage() {
  return (
    <main className="page-main" id="main-content">
      <section className="page-hero page-shell page-hero--left">
        <span className="section-label">Privacy boundary</span>
        <h1><b>You choose what Othie can read.</b> Everything else stays where it is.</h1>
        <p>Othie is built around selected local sources and bounded export. That does not make every connected AI workflow local.</p>
      </section>

      <section className="boundary-diagram page-shell" aria-label="Othie privacy boundary diagram">
        <div className="boundary-local">
          <span className="boundary-label">Your device</span>
          <div><FolderLock /><strong>Selected folders</strong><small>Markdown · text · PDF · DOCX</small></div>
          <i aria-hidden="true" />
          <div><Server /><strong>Othie engine</strong><small>Local indexing and retrieval</small></div>
        </div>
        <span className="boundary-gate"><KeyRound /><small>Per-host credential</small></span>
        <div className="boundary-host">
          <span className="boundary-label">Connected app</span>
          <div><Share2 /><strong>Permitted context</strong><small>Citations travel with results</small></div>
          <p>The host may send returned text to its own model provider.</p>
        </div>
      </section>

      <section className="privacy-copy page-shell">
        <article><span className="article-icon"><FolderLock /></span><div><h2>Source access is configured, not assumed.</h2><p>Othie reads roots you add to its configuration. It resolves real paths and rejects path escapes. Hidden, generated, state, and credential-like paths are excluded by default, but you should still review every source root you select.</p></div></article>
        <article><span className="article-icon"><EyeOff /></span><div><h2>Connecting a host does not open its conversations.</h2><p>An MCP connection makes Othie’s tools available to that host. It does not give Othie access to the host’s chats, unrelated tools, or third-party data.</p></div></article>
        <article><span className="article-icon"><Share2 /></span><div><h2>Local processing and local consumption are different.</h2><p>A local model can perform Othie’s semantic retrieval, extraction, and optional synthesis. A cloud-backed AI app may still send the context it receives to its model provider. Review that app’s terms and settings.</p></div></article>
        <article><span className="article-icon"><KeyRound /></span><div><h2>Each host gets a separate grant.</h2><p>Othie uses a separate credential and profile grant for Claude Desktop, Cursor, and VS Code. Credentials live outside the main configuration and should remain protected by the operating system account.</p></div></article>
      </section>

      <section className="privacy-limit page-shell">
        <div><span className="section-label">Current limits</span><h2>Plain statements, not compliance badges.</h2></div>
        <ul>
          <li>No application-managed encryption claim</li>
          <li>No enterprise or compliance certification</li>
          <li>No general prompt-injection guarantee</li>
          <li>No claim to securely erase filesystem backups</li>
          <li>No analytics enabled by this website build</li>
        </ul>
      </section>

      <section className="final-cta page-shell"><h2>Review setup before connecting a host.</h2><p>The current guide shows the local engine, credential, and host-configuration steps.</p><div><Link className="button button--primary button--large" href="/docs/setup">Read setup <ArrowRight size={17} /></Link><Link className="button button--secondary button--large" href="/download">Download status</Link></div></section>
    </main>
  );
}
