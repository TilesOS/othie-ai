"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "@/lib/site";
import { Logo } from "./logo";

/** lucide dropped brand marks, so the GitHub glyph is inlined. */
function GithubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="announce-bar">
        <Link href="/download">
          <span><b>In development:</b> {siteConfig.releaseStage} — no installer is published yet</span>
          <ArrowRight size={13} />
        </Link>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {siteConfig.nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
          <div className="header-actions">
            <a className="header-chip" href={siteConfig.repository} rel="noreferrer" target="_blank">
              <GithubMark /> <b>Source</b>
            </a>
            <Link className="header-chip" href="/docs/setup">Setup guide</Link>
            <Link className="button button--primary" href="/download">Get Othie</Link>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger className="icon-button mobile-menu-trigger" aria-label="Open navigation">
                <Menu size={19} strokeWidth={1.7} />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="mobile-menu-overlay" />
                <Dialog.Content className="mobile-menu-panel" aria-describedby={undefined}>
                  <div className="mobile-menu-top">
                    <Dialog.Title asChild><span className="mobile-menu-title">Navigate</span></Dialog.Title>
                    <Dialog.Close className="icon-button" aria-label="Close navigation">
                      <X size={19} strokeWidth={1.7} />
                    </Dialog.Close>
                  </div>
                  <nav className="mobile-nav" aria-label="Mobile navigation">
                    <Link href="/" onClick={() => setOpen(false)}>Home</Link>
                    {siteConfig.nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
                    <Link href="/docs/setup" onClick={() => setOpen(false)}>Setup guide</Link>
                  </nav>
                  <Link className="button button--primary mobile-menu-cta" href="/download" onClick={() => setOpen(false)}>
                    Get Othie <ArrowRight size={16} />
                  </Link>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
    </>
  );
}
