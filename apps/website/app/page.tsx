/**
 * THESIS: Make local context visible as a cited signal, not a generic AI landing page.
 * OWN-WORLD: Cool near-black planes, thin rules, restrained teal paths, and compact source metadata.
 * STORY: Select trusted documents, retrieve only relevant facts, then let a compatible host use them.
 * FIRST VIEWPORT: Quiet header; centered availability, promise, two actions; context paths gather behind the fold.
 * FORM: User-pinned Terax-like centered narrative, staged around an original document-to-context mechanism.
 */
import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ContextDemo } from "@/components/site/context-demo";
import { HomeSections } from "@/components/site/home-sections";
import { siteConfig } from "@/lib/site";
import "./extended.css";

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-inner">
          <Link className="availability-badge" href="/download"><span />{siteConfig.releaseStage}<ArrowRight size={14} /></Link>
          <h1 id="hero-title"><span>Your AI,</span>familiar with your work.</h1>
          <p>Othie brings your documents, preferences, and working rules into the AI tools you already use—with local processing and control over what you share.</p>
          <div className="hero-actions">
            <Link className="button button--primary button--large" href="/download">See download status <ArrowRight size={17} /></Link>
            <a className="button button--secondary button--large" href="#product">See how it works <ArrowDown size={17} /></a>
          </div>
          <div className="platform-line"><span>Desktop targets</span><strong>macOS · Apple Silicon</strong><i /><strong>Windows · x64</strong></div>
        </div>
      </section>
      <section className="demo-section" id="product" aria-labelledby="product-title">
        <div className="section-intro section-intro--centered">
          <span className="section-label">The context signal</span>
          <h2 id="product-title">The right pieces of your work, packed with their sources.</h2>
          <p>Othie retrieves whole facts that fit the request and a bounded context budget. Citations travel with every returned rule or excerpt.</p>
        </div>
        <ContextDemo />
      </section>
      <HomeSections />
    </main>
  );
}
