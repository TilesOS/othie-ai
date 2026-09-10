"use client";

import * as Slider from "@radix-ui/react-slider";
import { ArrowRight, Check, FileText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type Fact = { source: string; citation: string; text: string; tokens: number };

const examples: Array<{ label: string; prompt: string; facts: Fact[] }> = [
  {
    label: "Support reply",
    prompt: "Draft a reply for a customer waiting on an update.",
    facts: [
      { source: "Writing guide.md", citation: "writing-guide.md § Direct language", text: "Lead with the answer. Use direct language and name the next action.", tokens: 58 },
      { source: "Support policy.md", citation: "support-policy.md § Response target", text: "Customer support replies target four business hours on weekdays.", tokens: 42 },
      { source: "Writing guide.md", citation: "writing-guide.md § Commitments", text: "Do not promise a resolution time unless the owner has confirmed it.", tokens: 49 },
    ],
  },
  {
    label: "Product change",
    prompt: "How should I announce a product change?",
    facts: [
      { source: "Writing guide.md", citation: "writing-guide.md § Direct language", text: "Open with what changed, who it affects, and the action readers need to take.", tokens: 61 },
      { source: "Support policy.md", citation: "support-policy.md § Coverage", text: "Route account-specific questions to support instead of discussing them in release notes.", tokens: 55 },
    ],
  },
];

export function ContextDemo() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [budget, setBudget] = useState(150);
  const active = examples[exampleIndex];
  const selection = useMemo(() => active.facts.reduce<{ facts: Fact[]; usedTokens: number }>(
    (result, fact) => result.usedTokens + fact.tokens > budget
      ? result
      : { facts: [...result.facts, fact], usedTokens: result.usedTokens + fact.tokens },
    { facts: [], usedTokens: 0 },
  ), [active, budget]);
  const included = selection.facts;
  const usedTokens = selection.usedTokens;

  return (
    <div className="context-demo" aria-label="Illustrative Othie context retrieval demo" role="group">
      <div className="demo-toolbar">
        <div>
          <span className="demo-kicker">Illustrative browser demo</span>
          <p>Choose a request and see which whole, cited facts fit.</p>
        </div>
        <div className="query-tabs" aria-label="Example request" role="group">
          {examples.map((example, index) => (
            <button aria-pressed={exampleIndex === index} className={exampleIndex === index ? "is-selected" : undefined} key={example.label} onClick={() => setExampleIndex(index)} type="button">
              {example.label}
            </button>
          ))}
        </div>
      </div>
      <div className="demo-flow">
        <section className="demo-sources" aria-labelledby="demo-sources-title">
          <div className="demo-pane-heading"><span>01</span><h3 id="demo-sources-title">Selected sources</h3></div>
          <div className="source-file"><FileText size={18} /><div><strong>Writing guide.md</strong><span>Selected folder · local</span></div><Check size={16} aria-label="Selected" /></div>
          <div className="source-file"><FileText size={18} /><div><strong>Support policy.md</strong><span>Selected folder · local</span></div><Check size={16} aria-label="Selected" /></div>
          <p className="demo-note">Example documents are fictional and stay in this browser demo.</p>
        </section>
        <span className="flow-arrow" aria-hidden="true"><ArrowRight /></span>
        <section className="demo-context" aria-labelledby="demo-context-title">
          <div className="demo-pane-heading"><span>02</span><h3 id="demo-context-title">Cited context pack</h3></div>
          <blockquote>“{active.prompt}”</blockquote>
          <div className="fact-list" aria-live="polite">
            {included.map((fact) => (
              <article className="context-fact" key={fact.citation}><p>{fact.text}</p><span>[{fact.citation}]</span></article>
            ))}
          </div>
          <div className="budget-control">
            <div><label htmlFor="context-budget">Context budget</label><output>{budget} estimated tokens</output></div>
            <Slider.Root className="slider-root" id="context-budget" max={180} min={80} onValueChange={([value]) => setBudget(value)} step={10} value={[budget]}>
              <Slider.Track className="slider-track"><Slider.Range className="slider-range" /></Slider.Track>
              <Slider.Thumb aria-label="Illustrative context token budget" className="slider-thumb" />
            </Slider.Root>
            <span className="budget-summary">{included.length} whole {included.length === 1 ? "item" : "items"} · about {usedTokens} tokens</span>
          </div>
        </section>
        <span className="flow-arrow" aria-hidden="true"><ArrowRight /></span>
        <section className="demo-host" aria-labelledby="demo-host-title">
          <div className="demo-pane-heading"><span>03</span><h3 id="demo-host-title">Compatible AI app</h3></div>
          <div className="host-orbit" aria-hidden="true"><span className="host-orbit__ring" /><span className="host-orbit__core"><Sparkles size={22} /></span></div>
          <p>The connected app decides when to request and how to use this context.</p>
          <span className="host-status"><span /> Context available through MCP</span>
        </section>
      </div>
    </div>
  );
}
