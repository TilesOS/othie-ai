"use client";

import { useEffect, useState } from "react";

export type RailItem = { id: string; label: string };

/** Sticky scroll-spy rail alongside the feature block, as on Neon's product sections. */
export function SectionRail({ items, label = "On this page" }: { items: RailItem[]; label?: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const targets = items.map((item) => document.getElementById(item.id)).filter((node): node is HTMLElement => node !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0.1, 0.5, 1] },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="section-rail" aria-label={label}>
      <span>{label}</span>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? "true" : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
