"use client";
import { useState, useTransition } from "react";
import { setBuzzMode } from "../actions";

const MODES = [
  { id: "instant", label: "As it happens", hint: "An email when you're given a task, then reminders 3 days, 1 day and on the due day." },
  { id: "digest", label: "Once a day", hint: "One email at 8:00 in the morning with everything new, due soon, and class announcements." },
  { id: "off", label: "Off", hint: "No Buzz emails. Everything still shows in the app." },
] as const;

export function BuzzSetting({ initial }: { initial: "instant" | "digest" | "off" }) {
  const [mode, setMode] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section id="buzz" aria-labelledby="buzz-h" className="scroll-mt-8">
      <h2 id="buzz-h" className="font-display text-xl font-semibold">Buzz emails</h2>
      <p className="mt-1 text-muted">How team and class emails reach you. Teammates without an account always get them as they happen.</p>
      <div role="radiogroup" aria-labelledby="buzz-h" className="mt-4 grid gap-2">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} disabled={pending}
            onClick={() => { setMode(m.id); start(async () => { await setBuzzMode(m.id); setMsg("Saved."); }); }}
            className="grid gap-0.5 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-left hover:border-accent-edge aria-checked:border-accent-edge aria-checked:bg-raised">
            <span className="font-semibold">{m.label}</span><span className="text-sm text-muted">{m.hint}</span>
          </button>
        ))}
      </div>
      <p role="status" className="mt-2 min-h-6 text-sm text-muted">{msg}</p>
    </section>
  );
}
