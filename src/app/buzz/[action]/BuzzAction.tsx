"use client";
import { useState, useTransition } from "react";
import { Bee } from "@/components/brand/Bee";
import { runBuzzAction } from "./actions";

export function BuzzAction({ action, a, t }: { action: string; a: string; t: string }) {
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const help = action === "help";
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <Bee pose={res?.ok ? "celebrate" : help ? "wave" : "sleep"} size={96} />
      <h1 className="font-display text-2xl font-semibold">{res ? (res.ok ? (help ? "Help is on the way" : "Snoozed") : "Hmm") : help ? "Ask your team for help?" : "Snooze reminders for a day?"}</h1>
      <p role="status" className="max-w-[42ch] text-muted">{res ? res.message : help ? "We'll post on your team's Comb and email your team leader that you're stuck." : "You won't get reminder emails about this for 24 hours. The due date stays the same."}</p>
      {!res && <button type="button" disabled={pending} onClick={() => start(async () => setRes(await runBuzzAction(action, a, t)))} className="min-h-12 rounded-[var(--radius)] bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">{pending ? "One moment…" : help ? "Yes, I need help" : "Snooze for a day"}</button>}
    </div>
  );
}
