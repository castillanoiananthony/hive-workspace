"use client";
import { useEffect, useState } from "react";
import { Bee } from "@/components/brand/Bee";
import { Logo } from "@/components/brand/Logo";
import { getOps, getSavedAt, getTasks, queueTick, type OfflineTask } from "@/lib/offline-store";
import { flushAndRefresh } from "@/lib/offline-sync";

export function OfflineTasks() {
  const [tasks, setTasks] = useState<OfflineTask[] | null>(null);
  const [pending, setPending] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => { setTasks(await getTasks().catch(() => [])); setPending((await getOps().catch(() => [])).length); setSaved((await getSavedAt().catch(() => undefined)) ?? null); };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading this device's storage once on open
    setOnline(navigator.onLine); load();
    const up = async () => { setOnline(true); const r = await flushAndRefresh(); if (r) setMsg(r.conflicts.length ? `Synced, except ${r.conflicts.join(", ")} (changed more recently elsewhere).` : `Back online${r.synced ? `: ${r.synced} ${r.synced === 1 ? "change" : "changes"} synced` : ""}.`); load(); };
    const down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  const tick = async (t: OfflineTask, done: boolean) => {
    setTasks((xs) => xs && xs.map((x) => (x.key === t.key ? { ...x, done } : x))); // instant feedback
    await queueTick(t, done); await load();
    if (navigator.onLine) { const r = await flushAndRefresh(); if (r) { setMsg("Saved."); load(); } }
  };
  const open = (tasks ?? []).filter((t) => !t.done), done = (tasks ?? []).filter((t) => t.done);
  const row = (t: OfflineTask) => (
    <li key={t.key} className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3">
      <input type="checkbox" checked={t.done} onChange={(e) => tick(t, e.target.checked)} aria-label={`${t.title} done`} className="size-6 shrink-0 accent-[var(--accent)]" />
      <div className="min-w-0 flex-1">
        <p className={`font-medium [overflow-wrap:anywhere] ${t.done ? "text-muted line-through" : ""}`}>{t.title}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted">{t.color && <span aria-hidden className="size-2.5 rounded-full" style={{ background: t.color }} />}{t.context}{t.due && `, due ${t.due}`}</p>
      </div>
    </li>
  );
  return (
    <>
      <div className="flex items-center justify-between gap-3"><Logo size={26} />{online && <a href="/cell" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge">Open My Cell</a>}</div>
      <div role="status" className={`mt-6 rounded-[calc(var(--radius)*2)] border px-4 py-3 ${online ? "border-success/50 bg-success/10" : "border-accent-edge/60 bg-accent/10"}`}>
        {online ? (msg ?? "You're online.") : <>You&apos;re offline. Tick tasks off here; {pending ? `${pending} ${pending === 1 ? "change is" : "changes are"} waiting and will` : "changes will"} sync when you&apos;re back online.</>}
      </div>
      <h1 className="font-display mt-6 text-3xl font-semibold">Your tasks</h1>
      {saved && <p className="text-sm text-muted">Saved on this device {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(saved))}.</p>}
      {tasks === null ? null : tasks.length === 0 ? (
        <div className="mt-10 grid justify-items-center gap-3 text-center"><Bee pose="sleep" size={96} /><p className="max-w-[40ch] text-muted">No tasks saved on this device yet. Open HIVE-WORKSPACE once while you&apos;re online and they&apos;ll be here next time.</p></div>
      ) : (
        <>
          <ul className="mt-5 grid gap-2">{open.map(row)}</ul>
          {done.length > 0 && <><h2 className="font-display mt-8 text-lg font-semibold">Done today</h2><ul className="mt-2 grid gap-2">{done.map(row)}</ul></>}
        </>
      )}
    </>
  );
}
