"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

/** The terminal line Neon puts in its closing band: one command, copyable, nothing else. */
export function CommandBlock({ command, prefix = "$" }: { command: string; prefix?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="command-box">
      <span aria-hidden="true">{prefix}</span>
      <code>{command}</code>
      <button
        className="command-copy"
        data-copied={copied}
        type="button"
        aria-label={copied ? "Command copied" : "Copy command"}
        onClick={() => {
          void navigator.clipboard?.writeText(command).then(() => setCopied(true)).catch(() => setCopied(false));
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
