"use client";
import { useState, useTransition } from "react";
import { updateName } from "../actions";

export function NameField({ initial }: { initial: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="mt-4 grid max-w-md gap-2" onSubmit={(e) => {
      e.preventDefault();
      const n = String(new FormData(e.currentTarget).get("name"));
      start(async () => { try { await updateName(n); setMsg("Saved."); } catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't save."); } });
    }}>
      <label htmlFor="your-name" className="font-medium">Your name</label>
      <div className="flex gap-2">
        <input id="your-name" name="name" defaultValue={initial} required maxLength={80} autoComplete="name" aria-describedby="your-name-hint" className="min-h-11 min-w-0 flex-1 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge" />
        <button disabled={pending} className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">Save</button>
      </div>
      <p id="your-name-hint" className="text-sm text-muted" role="status">{msg ?? "Teammates see it in Buzz emails."}</p>
    </form>
  );
}
