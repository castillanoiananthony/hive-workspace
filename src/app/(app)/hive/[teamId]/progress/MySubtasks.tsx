"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setSubtaskDone } from "../../work-actions";

export type MySubtaskT = { id: string; title: string; taskId: string; taskTitle: string; due: string | null; overdue: boolean; done: boolean };

/** Subtasks you own in this team: tick them off here. */
export function MySubtasks({ items }: { items: MySubtaskT[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ticks, setTicks] = useState<Record<string, boolean>>({}); // instant feedback while the server saves
  return (
    <ul className="mt-3 divide-y divide-line rounded-[calc(var(--radius)*2)] border border-line bg-surface">
      {items.map((s) => (
        <li key={s.id} className="flex items-start gap-3 px-4 py-3">
          <input type="checkbox" checked={ticks[s.id] ?? s.done} disabled={pending} aria-label={`${s.title} done`} onChange={(e) => { const v = e.target.checked; setTicks((x) => ({ ...x, [s.id]: v })); start(async () => { try { await setSubtaskDone(s.id, v); router.refresh(); } catch { setTicks((x) => ({ ...x, [s.id]: !v })); } }); }} className="mt-1 size-5 shrink-0 accent-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className={`font-medium ${s.done ? "text-muted line-through" : ""}`}>{s.title}</p>
            <p className="text-sm text-muted">Part of <Link href={`/tasks/${s.taskId}`} className="underline underline-offset-4 hover:text-ink">{s.taskTitle || "Untitled task"}</Link>{s.due && <>, <span className={s.overdue && !s.done ? "text-danger" : undefined}>{s.overdue && !s.done ? "overdue, " : "due "}{s.due}</span></>}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
