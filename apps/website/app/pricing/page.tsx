import type { Metadata } from "next";
import { ArrowRight, Check, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { Faq } from "@/components/site/faq";
import { pricingConfig } from "@/lib/pricing";
import "../extended.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Othie pricing status, planned product scope, and answers about model and provider costs.",
};

export default function PricingPage() {
  const hasOffers = pricingConfig.status === "published" && pricingConfig.offers.length > 0;
  return (
    <main className="page-main" id="main-content">
      <section className="page-hero page-shell page-hero--pricing">
        <span className="availability-badge"><span /> Commercial details in progress</span>
        <h1>Clear terms,<br />when they are real.</h1>
        <p>Othie’s plans and entitlements are still being defined. We will publish pricing alongside the public release—not fill this page with pretend tiers.</p>
      </section>

      {hasOffers ? (
        <section className="offers-grid page-shell" aria-label="Available Othie plans">
          {pricingConfig.offers.map((offer) => (
            <article key={offer.id}><h2>{offer.name}</h2><strong>{offer.price}</strong><ul>{offer.entitlements.map((item) => <li key={item}>{item}</li>)}</ul><a className="button button--primary" href={offer.destination}>Choose {offer.name}</a></article>
          ))}
        </section>
      ) : (
        <section className="pricing-status page-shell" aria-labelledby="pricing-status-title">
          <div className="pricing-status__lead"><CircleDollarSign size={26} /><span className="section-label">Unpublished pricing</span><h2 id="pricing-status-title">{pricingConfig.message}</h2><p>No billing period, discount, or paid action appears until there is an approved offer and a real destination.</p></div>
          <div className="pricing-scope">
            <div><span>What the product is for</span><p>A single-user local context engine that serves cited context to compatible AI tools.</p></div>
            <div><span>What remains undecided</span><p>Plan names, prices, entitlements, individual versus team terms, billing, and license enforcement.</p></div>
            <div><span>What is separate</span><p>Any model-provider charges are set by that provider. The optional Othie model has no published artifact or requirements yet.</p></div>
          </div>
        </section>
      )}

      <section className="included-section page-shell" aria-labelledby="scope-title">
        <div><span className="section-label">Current product scope</span><h2 id="scope-title">What Othie is being built to include.</h2></div>
        <ul className="scope-list">
          <li><Check size={16} /><span><strong>Local engine</strong>Indexes sources you select and serves bounded context through MCP.</span></li>
          <li><Check size={16} /><span><strong>Cited retrieval</strong>Keeps source locations and whole-item qualifications attached.</span></li>
          <li><Check size={16} /><span><strong>Per-host control</strong>Uses separate credentials and grants for each connected AI app.</span></li>
          <li><Check size={16} /><span><strong>Keyword fallback</strong>Continues lexical retrieval when a configured model is unavailable.</span></li>
        </ul>
      </section>

      <section className="faq-section page-shell" aria-labelledby="pricing-faq-title">
        <div><span className="section-label">Pricing questions</span><h2 id="pricing-faq-title">What is known today.</h2></div>
        <Faq items={[
          { question: "Is the beta free?", answer: "No beta price has been approved, so this site does not describe beta access as free or paid." },
          { question: "Is the local model included?", answer: "The Othie model is a separate pending release input. Its license, artifact, size, and hardware requirements have not been published." },
          { question: "Will I pay an AI provider?", answer: "Only if you explicitly configure a remote provider or use a connected host with provider charges. Those costs are controlled by the relevant provider, not this unpublished pricing page." },
          { question: "Are updates included?", answer: "Update terms have not been approved. They will appear with the real offer rather than being inferred here." },
          { question: "Can a team use Othie?", answer: "The current engine is a single-user local implementation. Team entitlements and centrally managed controls are not part of the verified v1 scope." },
        ]} />
      </section>

      <section className="final-cta page-shell"><h2>Follow the build without guessing the offer.</h2><p>Check release availability or review the current developer setup.</p><div><Link className="button button--primary button--large" href="/download">Download status <ArrowRight size={17} /></Link><Link className="button button--secondary button--large" href="/docs/setup">Developer setup</Link></div></section>
    </main>
  );
}
