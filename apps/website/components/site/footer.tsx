import Link from "next/link";
import { Logo } from "./logo";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>Selected documents, cited context, and a boundary you set — available to the AI tools you already use.</p>
          <span className="mono-meta">{siteConfig.releaseStage}</span>
        </div>
        <div className="footer-links">
          <div>
            <span className="footer-label">Product</span>
            <Link href="/#product">How it works</Link>
            <Link href="/#sources">Sources</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/download">Download</Link>
          </div>
          <div>
            <span className="footer-label">Resources</span>
            <Link href="/docs/setup">Setup guide</Link>
            <Link href="/#compatibility">Compatibility</Link>
            <a href={siteConfig.repository} rel="noreferrer" target="_blank">GitHub</a>
          </div>
          <div>
            <span className="footer-label">Boundary</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/privacy#local">Local processing</Link>
            <Link href="/privacy#hosts">Connected hosts</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Othie AI</span>
        <span className="footer-status"><i />Analytics off by default</span>
      </div>
    </footer>
  );
}
