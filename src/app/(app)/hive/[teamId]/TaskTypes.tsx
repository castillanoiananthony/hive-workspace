"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BUILTIN_TYPES } from "@/components/app/TypeTag";
import { addTaskType, deleteTaskType } from "../team-extras-actions";
import type { TeamT } from "./types";

/** The hive's task types: Bug, Feature and Decision come built in; the team adds its own (Research, Design, Hardware…). */
export function TaskTypes({ team }: { team: TeamT }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { try { await fn(); setMsg(null); router.refresh(); } catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't save."); } });
  const custom = team.taskTypes ?? [];
  const chip = "inline-flex min-h-10 items-center gap-2 rounded-full border border-line pl-3 text-sm font-medium";
  return (
    <section aria-labelledby="types-h" className="grid gap-3 rounded-[var(--radius)] border border-line p-4">
      <h2 id="types-h" className="font-display text-lg font-semibold">Task types</h2>
      <p className="text-sm text-muted">Pick a type on any team task. Bug, Feature and Decision come with their own fields; add any others your team uses.</p>
      <ul className="flex flex-wrap gap-2">
        {Object.values(BUILTIN_TYPES).map((t) => <li key={t.label} className={`${chip} pr-3`}><span aria-hidden className="size-2.5 rounded-full" style={{ background: t.color }} />{t.label}</li>)}
        {custom.map((t) => (
          <li key={t.id} className={`${chip} pr-1`}>
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: t.color }} /><span>{t.label}</span>
            <button type="button" disabled={pending} aria-label={`Remove the ${t.label} type`} onClick={() => { if (confirm(`Remove the ${t.label} type? Its tasks stay, as plain tasks.`)) run(() => deleteTaskType(team.id, t.id)); }} className="grid size-8 place-items-center rounded-full text-muted hover:text-danger">×</button>
          </li>
        ))}
      </ul>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await addTaskType(team.id, name); setName(""); }); }}>
        <label className="sr-only" htmlFor="new-type">New task type</label>
        <input id="new-type" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. Research" className="min-h-11 min-w-0 flex-1 basis-40 rounded-[var(--radius)] border border-line bg-bg px-3 text-base" />
        <button disabled={pending || !name.trim()} className="min-h-11 rounded-[var(--radius)] border border-accent-edge/70 px-4 font-medium text-accent-text hover:bg-accent/10 disabled:opacity-60">Add type</button>
      </form>
      <p role="status" className="text-sm text-danger">{msg}</p>
    </section>
  );
}
