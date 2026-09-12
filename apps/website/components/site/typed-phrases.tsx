"use client";

import { useEffect, useState } from "react";

const TYPE_MS = 58;
const DELETE_MS = 28;
const HOLD_MS = 2200;
const SWITCH_MS = 420;

/**
 * Types the closing clause of the hero sentence, cycling through the phrases.
 * The animation is decorative: it is hidden from assistive technology, and the
 * caller renders one stable phrase for screen readers and for reduced motion.
 */
export function TypedPhrases({ phrases }: { phrases: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setEnabled(!query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const phrase = phrases[index] ?? "";

    if (!deleting && length === phrase.length) {
      const timer = window.setTimeout(() => setDeleting(true), HOLD_MS);
      return () => window.clearTimeout(timer);
    }
    // Advancing on a timer rather than synchronously keeps the state change in a
    // callback, and gives the caret a beat to rest between phrases.
    if (deleting && length === 0) {
      const timer = window.setTimeout(() => {
        setDeleting(false);
        setIndex((current) => (current + 1) % phrases.length);
      }, SWITCH_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => setLength((current) => current + (deleting ? -1 : 1)),
      deleting ? DELETE_MS : TYPE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [enabled, deleting, index, length, phrases]);

  // Reduced motion keeps the first phrase on screen, fully written, with no caret.
  if (!enabled) return <span className="hero-typed" aria-hidden="true">{phrases[0]}</span>;

  return (
    <span className="hero-typed" aria-hidden="true">
      {(phrases[index] ?? "").slice(0, length)}
      <i className="hero-caret" />
    </span>
  );
}
