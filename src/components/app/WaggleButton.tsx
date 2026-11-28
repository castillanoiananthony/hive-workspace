"use client";
import { useState } from "react";

/** Copies a ready-made group-chat update (or shows it to copy by hand if the clipboard is blocked). */
export function WaggleButton({ text, label = "Copy update for GC" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "show">("idle");
  return (
    <div className="grid gap-2">
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setState("copied"); setTimeout(() => setState("idle"), 2500); } catch { setState("show"); } }}
        className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-[var(--radius)] border border-accent-edge/70 px-4 text-sm font-medium text-accent-text hover:bg-accent/10">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h12a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 3v-3H4a2 2 0 01-2-2V7a2 2 0 012-2z" /><path d="M7 9h8M7 12h5" /></svg>
        {state === "copied" ? "Copied! Paste it in your GC" : label}
      </button>
      <span role="status" className="sr-only">{state === "copied" ? "Update copied" : ""}</span>
      {state === "show" && <textarea readOnly value={text} rows={8} onFocus={(e) => e.currentTarget.select()} aria-label="Update to copy" className="rounded-[var(--radius)] border border-line bg-bg p-3 font-mono text-sm" />}
    </div>
  );
}
