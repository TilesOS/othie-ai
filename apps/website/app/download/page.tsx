import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, CheckCircle2, Cpu, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { DownloadChooser } from "@/components/site/download-chooser";
import "../extended.css";

export const metadata: Metadata = {
  title: "Download",
  description: "Check verified Othie desktop release availability for macOS Apple Silicon and Windows x64.",
};

export default function DownloadPage() {
  return (
    <main className="page-main" id="main-content">
      <section className="page-hero page-shell">
        <span className="mono-label"><i className="signal-dot" /> Installers not yet published</span>
        <h1><b>Choose the right Othie desktop build.</b> Detection suggests; it never downloads.</h1>
        <p>Device detection can suggest a platform, never start a download. Architecture stays unknown until the browser can establish it reliably.</p>
      </section>
      <div className="page-shell"><DownloadChooser /></div>

      <section className="download-details page-shell" aria-labelledby="requirements-title">
        <div>
          <span className="section-label">Known targets</span>
          <h2 id="requirements-title"><b>Release requirements stay attached to the release.</b> Every field is present before a build becomes downloadable.</h2>
          <p>Version, release date, minimum OS, file size, checksum, release notes, signing, and notarization are all recorded against the build itself.</p>
        </div>
        <div className="requirements-list">
          <article><Cpu /><div><strong>macOS · Apple Silicon</strong><p>Targeted. Minimum macOS, size, checksum, signing, and notarization are pending.</p><a className="text-link" href="https://support.apple.com/en-us/116943" target="_blank" rel="noreferrer">Check your Mac chip <ExternalLink size={14} /></a></div></article>
          <article><Cpu /><div><strong>Windows · x64</strong><p>Targeted. Minimum Windows version, size, checksum, and signing are pending.</p><a className="text-link" href="https://support.microsoft.com/en-us/windows/32-bit-and-64-bit-windows-frequently-asked-questions-c6ca9541-8dce-4d48-0415-94a3faa2e13d" target="_blank" rel="noreferrer">Check system type <ExternalLink size={14} /></a></div></article>
        </div>
      </section>

      <section className="after-download page-shell" aria-labelledby="after-download-title">
        <div className="section-intro"><span className="section-label">After downloading</span><h2 id="after-download-title"><b>What the native setup will handle.</b> A browser download only transfers a file.</h2><p>Installation, permissions, configuration, and verification all happen in the desktop application.</p></div>
        <ol>
          <li><span>01</span><div><strong>Open and review</strong><p>Confirm the publisher and follow the operating system’s installation prompt.</p></div></li>
          <li><span>02</span><div><strong>Choose sources and model</strong><p>Select local folders explicitly, then choose a documented model or limited mode.</p></div></li>
          <li><span>03</span><div><strong>Connect selected apps</strong><p>Review supported apps, approve only the ones you want, and preserve unrelated settings.</p></div></li>
          <li><span>04</span><div><strong>Verify each host</strong><p>Restart or approve the host when requested, then confirm its Othie tools are available.</p></div></li>
        </ol>
      </section>

      <section className="troubleshooting page-shell" aria-labelledby="troubleshooting-title">
        <div><span className="section-label">Troubleshooting</span><h2 id="troubleshooting-title"><b>If no build fits.</b></h2></div>
        <div>
          <article><AlertTriangle /><h3>Unsupported hardware</h3><p>Intel Mac, Windows ARM, Linux, ChromeOS, iOS, iPadOS, Android, and mobile builds are not currently promised.</p></article>
          <article><RotateCcw /><h3>Build unavailable</h3><p>Use the documented developer setup or follow repository releases. An unavailable build never becomes a fake link.</p></article>
          <article><CheckCircle2 /><h3>Host not showing Othie</h3><p>Review the generated configuration, trust prompts, credentials, and restart requirements for that specific host.</p></article>
        </div>
        <Link className="button button--secondary" href="/docs/setup">Open developer setup <ArrowRight size={16} /></Link>
      </section>
    </main>
  );
}
