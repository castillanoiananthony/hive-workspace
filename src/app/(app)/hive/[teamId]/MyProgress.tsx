"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { ImportanceTag } from "@/components/app/ImportanceTag";
import { formatDue } from "@/lib/dates";
import { importanceOf } from "@/lib/importance";
import { logProgress } from "../actions";
import type { AssignedT, LogT, TaskT } from "./types";

const btnPrimary = "min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";
const outline = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
export const fmtDay = (iso: string, tz: string) => new Intl.DateTimeFormat("en", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
export const pctOf = (a: AssignedT) => (a.doneAt ? 100 : a.progress);

export function Bar({ value, label }: { value: number; label: string }) {
  return (
    <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label} className="block h-2 w-full overflow-hidden rounded-full bg-raised">
      <span className="block h-full rounded-full" style={{ width: `${value}%`, background: value === 100 ? "var(--viz-3)" : "var(--accent)" }} />
    </span>
  );
}

/** One of your own parts: slide your progress, say what you did, mark it done or not. Each save is a dated log entry. */
export function MyTask({ t, a, logs, tz, colors, open = false }: { t: TaskT; a: AssignedT; logs: LogT[]; tz: string; colors: Record<string, string> | null; open?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(pctOf(a));
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = Boolean(a.doneAt);
  const save = (markDone: boolean) => start(async () => {
    try { await logProgress(t.id, { progress: value, note, done: markDone }); setNote(""); setMsg(markDone ? "Marked done and logged." : "Progress logged."); if (!markDone && value === 100) setValue(99); router.refresh(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't save."); }
  });
  return (
    <li className="overflow-hidden rounded-[calc(var(--radius)*2)] border-2 border-line bg-surface" style={{ borderColor: importanceOf(t.importance, colors)?.color }}>
      <BusyOverlay show={pending} label="Saving your progress…" />
      <details className="group" open={open}>
        <summary className="grid cursor-pointer list-none gap-2 px-5 py-3 hover:bg-raised/50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            <span className={`min-w-0 flex-1 font-medium ${done ? "text-muted line-through" : ""}`}>{t.title || "Untitled task"}</span>
            <ImportanceTag level={t.importance} colors={colors} />
            {t.dueAt && <span className="hidden text-sm whitespace-nowrap text-muted sm:inline">{formatDue(new Date(t.dueAt), t.hasTime, tz)}</span>}
          </span>
          <span className="flex items-center gap-3 pl-8"><Bar value={pctOf(a)} label={`Your progress on ${t.title}`} /><span className="w-12 shrink-0 text-right text-sm tabular-nums">{pctOf(a)}%</span></span>
        </summary>
        <div className="grid gap-4 px-5 pt-1 pb-5 pl-13">
          <label className="grid gap-2">
            <span className="flex justify-between text-sm font-medium"><span>Your progress</span><span className="tabular-nums">{value}%</span></span>
            <input type="range" min={0} max={100} step={5} value={value} disabled={pending} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          </label>
          <label className="grid gap-1"><span className="text-sm font-medium">What did you do? <span className="font-normal text-muted">(optional)</span></span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Set up the simulator and ran the first test" className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-base focus:border-accent-edge" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => save(false)} className={outline}>{done ? "Mark not done" : "Log progress"}</button>
            {!done && <button type="button" disabled={pending} onClick={() => save(true)} className={btnPrimary}>Mark done</button>}
            <Link href={`/tasks/${t.id}`} className={`${outline} inline-flex items-center`}>Open task</Link>
          </div>
          <p role="status" className="text-sm text-muted">{msg}</p>
          {logs.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">Your log</h3>
              <ol className="mt-2 grid gap-2 border-l-2 border-line pl-4">
                {logs.slice(0, 20).map((l) => (
                  <li key={l.id} className="text-sm">
                    <span className="text-muted">{fmtDay(l.at, tz)}</span>{" "}
                    <span className="font-medium tabular-nums">{l.done ? "Done ✓" : `${l.progress}%`}</span>
                    {l.note && <span className="block">{l.note}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
