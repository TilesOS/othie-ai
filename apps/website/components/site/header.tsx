"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site";
import { Logo } from "./logo";

export function Header() {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 28);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${compact ? " site-header--compact" : ""}`}>
      <div className="header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {siteConfig.nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
        </nav>
        <Link className="button button--primary desktop-cta" href="/download">
          Get Othie <span aria-hidden="true">↗</span>
        </Link>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="icon-button mobile-menu-trigger" aria-label="Open navigation">
            <Menu size={20} strokeWidth={1.7} />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="mobile-menu-overlay" />
            <Dialog.Content className="mobile-menu-panel" aria-describedby={undefined}>
              <div className="mobile-menu-top">
                <Dialog.Title asChild><span className="mobile-menu-title">Navigate</span></Dialog.Title>
                <Dialog.Close className="icon-button" aria-label="Close navigation">
                  <X size={20} strokeWidth={1.7} />
                </Dialog.Close>
              </div>
              <nav className="mobile-nav" aria-label="Mobile navigation">
                <Link href="/" onClick={() => setOpen(false)}>Home</Link>
                {siteConfig.nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
              </nav>
              <Link className="button button--primary mobile-menu-cta" href="/download" onClick={() => setOpen(false)}>
                See download status <span aria-hidden="true">↗</span>
              </Link>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
