"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { ImportanceTag } from "@/components/app/ImportanceTag";
import { TypeTag } from "@/components/app/TypeTag";
import { formatDue } from "@/lib/dates";
import { importanceOf } from "@/lib/importance";
import { newTeamTask } from "../actions";
import { Kanban } from "./Kanban";
import { MemberAvatar } from "./MemberAvatar";
import { Bar, fmtDay, pctOf } from "./MyProgress";
import { has, nameOf, type AssignedT, type ContributionT, type LogT, type MeT, type MemberT, type TaskT, type TeamT } from "./types";
import { WaggleButton } from "@/components/app/WaggleButton";
import { waggle } from "@/lib/waggle";

const btnPrimary = "min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";
const Chevron = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>;

/** The Tasks tab: your own parts first (with progress), then every team task as a card that opens to show each person. */
export function Board({ team, members, tasks, assigned, logs, tz, me, onRoster, contributions = [] }: { team: TeamT; members: MemberT[]; tasks: TaskT[]; assigned: AssignedT[]; logs: LogT[]; tz: string; me: MeT; onRoster: () => void; contributions?: ContributionT[] }) {
  const [now] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const [view, setView] = useState<"list" | "board">("list");
  const others = members.filter((m) => !m.isAdmin);
  if (others.length === 0 && has(me, "members")) return <EmptyState pose="idle" title="Invite your teammates first" body="Add their emails or share the join link, then you can start assigning tasks." action={<button type="button" onClick={onRoster} className={btnPrimary}>Invite members</button>} />;
  if (tasks.length === 0) return <EmptyState title="No team tasks yet" body={has(me, "tasks") ? "Make a task, pick who does it and add the steps under “How to do it”. They get it by email." : "When a task is assigned to you it shows up here."} action={has(me, "tasks") ? <button type="button" disabled={pending} onClick={() => start(() => newTeamTask(team.id))} className={btnPrimary}>New team task</button> : undefined} />;

  const mine = tasks.filter((t) => assigned.some((a) => a.taskId === t.id && a.memberId === me.memberId));
  const avg = (rows: AssignedT[]) => (rows.length ? Math.round(rows.reduce((s, a) => s + pctOf(a), 0) / rows.length) : null);
  const people = members.map((m) => ({ m, pct: avg(assigned.filter((a) => a.memberId === m.id)) })).filter((p) => p.pct !== null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {people.length > 0 && (
        <ul aria-label="Everyone's progress" className="relative flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {people.map(({ m, pct }) => (
            <li key={m.id} className="flex min-w-48 items-center gap-3 rounded-[calc(var(--radius)*2)] border border-line bg-surface px-4 py-3">
              <MemberAvatar m={m} color={team.color} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{nameOf(m)}</p><Bar value={pct!} label={`${nameOf(m)}: ${pct}% done`} /><p className="mt-1 text-sm text-muted tabular-nums">{pct}% done</p></div>
            </li>
          ))}
        </ul>
      )}

      {(mine.length > 0 || (me.subtasks ?? 0) > 0) && (
        <Link href={`/hive/${team.id}/progress`} className="group flex items-center gap-4 rounded-[calc(var(--radius)*2)] border border-accent-edge/60 bg-surface px-5 py-4 hover:bg-raised">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/15 font-display font-semibold text-accent-text tabular-nums">{avg(assigned.filter((a) => a.memberId === me.memberId)) ?? 0}%</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold">Your progress</span>
            <span className="block text-sm text-muted">{mine.length} {mine.length === 1 ? "task" : "tasks"}{me.subtasks ? ` and ${me.subtasks} ${me.subtasks === 1 ? "subtask" : "subtasks"}` : ""} assigned to you. Update your progress and logs.</span>
          </span>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
      )}

      <section aria-labelledby="all-h" className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="all-h" className="font-display text-lg font-semibold">All team tasks</h2>
          <WaggleButton text={waggle({
            team: team.name, date: new Intl.DateTimeFormat("en", { timeZone: tz, month: "short", day: "numeric" }).format(now),
            done: contributions.filter((c) => c.kind !== "sent_for_review" && now - new Date(c.at).getTime() < 7 * 86_400_000).map((c) => ({ who: (() => { const m = members.find((x) => x.id === c.memberId); return m ? nameOf(m) : "someone"; })(), what: c.what })),
            tasks: tasks.map((t) => { const d = t.dueAt ? new Date(t.dueAt).getTime() : null; return { title: t.title, status: t.status, progress: avg(assigned.filter((a) => a.taskId === t.id)), due: t.dueAt ? formatDue(new Date(t.dueAt), t.hasTime, tz) : null, dueSoon: d !== null && d >= now && d - now < 3 * 86_400_000, overdue: d !== null && d < now }; }),
          })} />
          <div role="radiogroup" aria-label="View" className="flex rounded-full border border-line bg-surface p-1">
            {(["list", "board"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                className="min-h-9 rounded-full px-4 text-sm font-medium text-muted aria-checked:bg-accent aria-checked:font-semibold aria-checked:text-on-accent">{v === "list" ? "List" : "Board"}</button>
            ))}
          </div>
        </div>
        {view === "board" ? <Kanban team={team} tasks={tasks} members={members} assigned={assigned} me={me} tz={tz} /> : <>
        {tasks.map((t) => {
          const parts = assigned.filter((a) => a.taskId === t.id);
          const overall = avg(parts);
          const overdue = t.status !== "done" && t.dueAt && new Date(t.dueAt).getTime() < now;
          return (
            <details key={t.id} className="group rounded-[calc(var(--radius)*2)] border-2 border-line bg-surface" style={{ borderColor: importanceOf(t.importance, team.importanceColors)?.color }}>
              <summary className="grid cursor-pointer list-none gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <Chevron />
                  <span className="min-w-0 flex-1 font-medium">{t.title || "Untitled task"}</span>
                  <TypeTag type={t.type} />
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
        </>}
      </section>
    </div>
  );
}

