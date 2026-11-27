"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { EmptyState } from "@/components/app/EmptyState";
import { ImportanceTag } from "@/components/app/ImportanceTag";
import { formatDue } from "@/lib/dates";
import { logProgress, newTeamTask } from "../actions";
import { MemberAvatar } from "./MemberAvatar";
import { has, nameOf, type AssignedT, type LogT, type MeT, type MemberT, type TaskT, type TeamT } from "./types";

const btnPrimary = "min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";
const outline = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
const fmtDay = (iso: string, tz: string) => new Intl.DateTimeFormat("en", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const pctOf = (a: AssignedT) => (a.doneAt ? 100 : a.progress);

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label} className="block h-2 w-full overflow-hidden rounded-full bg-raised">
      <span className="block h-full rounded-full" style={{ width: `${value}%`, background: value === 100 ? "var(--viz-3)" : "var(--accent)" }} />
    </span>
  );
}
const Chevron = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>;

/** The Tasks tab: your own parts first (with progress), then every team task as a card that opens to show each person. */
export function Board({ team, members, tasks, assigned, logs, tz, me, onRoster }: { team: TeamT; members: MemberT[]; tasks: TaskT[]; assigned: AssignedT[]; logs: LogT[]; tz: string; me: MeT; onRoster: () => void }) {
  const [now] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const others = members.filter((m) => !m.isAdmin);
  if (others.length === 0 && has(me, "members")) return <EmptyState pose="idle" title="Invite your teammates first" body="Add their emails or share the join link, then you can start assigning tasks." action={<button type="button" onClick={onRoster} className={btnPrimary}>Invite members</button>} />;
  if (tasks.length === 0) return <EmptyState title="No team tasks yet" body={has(me, "tasks") ? "Make a task, pick who does it and add the steps under “How to do it”. They get it by email." : "When a task is assigned to you it shows up here."} action={has(me, "tasks") ? <button type="button" disabled={pending} onClick={() => start(() => newTeamTask(team.id))} className={btnPrimary}>New team task</button> : undefined} />;

  const mine = tasks.filter((t) => assigned.some((a) => a.taskId === t.id && a.memberId === me.memberId));
  const avg = (rows: AssignedT[]) => (rows.length ? Math.round(rows.reduce((s, a) => s + pctOf(a), 0) / rows.length) : null);
  const people = members.map((m) => ({ m, pct: avg(assigned.filter((a) => a.memberId === m.id)) })).filter((p) => p.pct !== null);

  return (
    <div className="grid gap-6">
      {people.length > 0 && (
        <ul aria-label="Everyone's progress" className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {people.map(({ m, pct }) => (
            <li key={m.id} className="flex min-w-48 items-center gap-3 rounded-[calc(var(--radius)*2)] border border-line bg-surface px-4 py-3">
              <MemberAvatar m={m} color={team.color} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{nameOf(m)}</p><Bar value={pct!} label={`${nameOf(m)}: ${pct}% done`} /><p className="mt-1 text-sm text-muted tabular-nums">{pct}% done</p></div>
            </li>
          ))}
        </ul>
      )}

      {mine.length > 0 && (
        <details open className="group/mine rounded-[calc(var(--radius)*2)] border border-line bg-surface">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 [&::-webkit-details-marker]:hidden">
            <h2 className="font-display text-lg font-semibold">Your tasks in this team <span className="font-normal text-muted">({mine.length})</span></h2>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="text-muted transition-transform group-open/mine:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {mine.map((t) => <MyTask key={t.id} t={t} a={assigned.find((a) => a.taskId === t.id && a.memberId === me.memberId)!} logs={logs.filter((l) => l.taskId === t.id && l.memberId === me.memberId)} tz={tz} colors={team.importanceColors} />)}
          </ul>
        </details>
      )}

      <section aria-labelledby="all-h" className="grid gap-3">
        <h2 id="all-h" className="font-display text-lg font-semibold">All team tasks</h2>
        {tasks.map((t) => {
          const parts = assigned.filter((a) => a.taskId === t.id);
          const overall = avg(parts);
          const overdue = t.status !== "done" && t.dueAt && new Date(t.dueAt).getTime() < now;
          return (
            <details key={t.id} className="group rounded-[calc(var(--radius)*2)] border border-line bg-surface">
              <summary className="grid cursor-pointer list-none gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <Chevron />
                  <span className="min-w-0 flex-1 font-medium">{t.title || "Untitled task"}</span>
                  <ImportanceTag level={t.importance} colors={team.importanceColors} />
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-sm text-muted">
                  {t.dueAt && <span className={overdue ? "text-danger" : undefined}>{overdue ? "Overdue, due " : "Due "}{formatDue(new Date(t.dueAt), t.hasTime, tz)}</span>}
                  <span>{parts.length ? `${parts.filter((a) => a.doneAt).length} of ${parts.length} done` : "Nobody assigned yet"}</span>
                </span>
                {overall !== null && <span className="flex items-center gap-3 pl-8"><Bar value={overall} label={`${t.title}: ${overall}% done overall`} /><span className="w-12 shrink-0 text-right text-sm tabular-nums">{overall}%</span></span>}
              </summary>
              <div className="border-t border-line px-5 py-4">
                {parts.length === 0 ? <p className="text-sm text-muted">Open the task to choose who does it.</p> : (
                  <ul className="grid gap-3">
                    {parts.map((a) => {
                      const m = members.find((x) => x.id === a.memberId);
                      const last = logs.find((l) => l.taskId === t.id && l.memberId === a.memberId && l.note);
                      if (!m) return null;
                      return (
                        <li key={a.memberId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                          <MemberAvatar m={m} color={team.color} size={32} />
                          <span className="min-w-0"><span className="block truncate font-medium">{nameOf(m)}</span><Bar value={pctOf(a)} label={`${nameOf(m)}: ${pctOf(a)}% done`} /></span>
                          <span className={`text-sm tabular-nums ${a.doneAt ? "text-success" : "text-muted"}`}>{a.doneAt ? "✓ Done" : `${a.progress}% done`}</span>
                          {last && <span className="col-start-2 col-end-4 text-sm text-muted">“{last.note}” <span className="whitespace-nowrap">{fmtDay(last.at, tz)}</span></span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link href={`/tasks/${t.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge">Open task</Link>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}

/** One of your own parts: slide your progress, say what you did, mark it done or not. Each save is a dated log entry. */
function MyTask({ t, a, logs, tz, colors }: { t: TaskT; a: AssignedT; logs: LogT[]; tz: string; colors: Record<string, string> | null }) {
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
    <li>
      <BusyOverlay show={pending} label="Saving your progress…" />
      <details className="group">
        <summary className="grid cursor-pointer list-none gap-2 px-5 py-3 hover:bg-raised/50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <Chevron />
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
