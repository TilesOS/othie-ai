import type { Metadata } from "next";
import { AlertCircle, ArrowRight, CheckCircle2, TerminalSquare } from "lucide-react";
import Link from "next/link";
import "../../extended.css";

export const metadata: Metadata = {
  title: "Setup guide",
  description: "Current developer setup for the Othie local engine and supported MCP host configurations.",
};

const hostCommands = [
  "node packages/engine/dist/src/cli.js host-config --host claude --config config.json --bridge claude --credential-file .othie/bridge-claude.credential",
  "node packages/engine/dist/src/cli.js host-config --host cursor --config config.json --bridge cursor --credential-file .othie/bridge-cursor.credential",
  "node packages/engine/dist/src/cli.js host-config --host vscode --config config.json --bridge vscode --credential-file .othie/bridge-vscode.credential",
];

export default function SetupPage() {
  return (
    <main className="page-main docs-main" id="main-content">
      <section className="docs-hero page-shell">
        <div><span className="section-label">Current developer setup</span><h1><b>Run Othie locally before installers arrive.</b></h1><p>This is the verified repository workflow, not the planned graphical setup wizard. It requires Node.js 24 LTS and terminal access.</p></div>
        <div className="docs-status"><TerminalSquare /><span>Repository workflow</span><strong>Available now</strong><small>macOS automated suite recorded; Windows and native-host checks remain release gates.</small></div>
      </section>

      <div className="docs-layout page-shell">
        <aside aria-label="On this page"><span>On this page</span><a href="#prepare">Prepare</a><a href="#configure">Configure</a><a href="#connect">Connect a host</a><a href="#verify">Verify</a></aside>
        <div className="docs-content">
          <section id="prepare"><span className="docs-step">01</span><h2>Prepare the repository</h2><p>Clone or open the Othie repository, then install and build its workspaces from the repository root.</p><pre><code>{`npm install\nnpm run build`}</code></pre></section>
          <section id="configure"><span className="docs-step">02</span><h2>Create the local configuration</h2><p>Initialize a configuration, then review its source roots before starting the engine. Ollama is optional for semantic and extraction features; keyword retrieval remains available without it.</p><pre><code>{`npm run engine -- init --config config.json\n\n# Optional local models\nollama pull nomic-embed-text\nollama pull qwen3:4b`}</code></pre><div className="docs-callout"><AlertCircle /><p>For Ollama local-only mode, disable its cloud features explicitly and verify the setting in Ollama’s log. A loopback URL alone does not prove every inference stays local.</p></div></section>
          <section id="connect"><span className="docs-step">03</span><h2>Create one credential per host</h2><p>Create a credential and profile grant for each host you intend to connect. The command writes the secret to a protected file instead of embedding it in the printed configuration.</p><pre><code>{`npm run engine -- credential create --config config.json \\\n  --bridge claude --profiles company --default-profile company \\\n  --out .othie/bridge-claude.credential\n\nnpm run engine -- engine foreground --config config.json`}</code></pre><h3>Print host configuration</h3><p>Run the relevant command below and merge its output into the host’s configuration. <code>host-config</code> prints configuration; it does not change host settings automatically.</p>{hostCommands.map((command) => <pre className="single-line-code" key={command}><code>{command}</code></pre>)}</section>
          <section id="verify"><span className="docs-step">04</span><h2>Verify from the host</h2><p>Enable or trust the server, restart the host if requested, and confirm both Othie tools appear. Then explicitly ask the host to call <code>get_organization_context</code> with a small synthetic source.</p><ul className="docs-checks"><li><CheckCircle2 /> <span><strong>Tool availability</strong><code>get_organization_context</code> and <code>get_context_status</code> are visible.</span></li><li><CheckCircle2 /> <span><strong>Citation update</strong>Edit and delete a synthetic file, then confirm its returned source changes.</span></li><li><CheckCircle2 /> <span><strong>Restart recovery</strong>Restart the engine and call status again from the same host session.</span></li></ul><p className="docs-note">A successful tool check does not prove that the host will call Othie automatically for every prompt.</p></section>
        </div>
      </div>
      <section className="final-cta page-shell"><h2><b>Prefer a guided installer?</b></h2><p>Watch the download page for verified native builds and release metadata.</p><div><Link className="button button--primary button--large" href="/download">Check download status <ArrowRight size={17} /></Link><a className="button button--secondary button--large" href="https://github.com/TilesOS/othie-ai" target="_blank" rel="noreferrer">Open GitHub</a></div></section>
    </main>
  );
}
