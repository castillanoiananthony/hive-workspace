"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImportanceTag } from "@/components/app/ImportanceTag";
import { TypeTag } from "@/components/app/TypeTag";
import { formatDue } from "@/lib/dates";
import { importanceOf } from "@/lib/importance";
import { moveTeamTask } from "../work-actions";
import { MemberAvatar } from "./MemberAvatar";
import { has, nameOf, type AssignedT, type MeT, type MemberT, type TaskT, type TeamT } from "./types";

const COLS = [
  { id: "todo", label: "To do" }, { id: "doing", label: "Doing" }, { id: "review", label: "Needs review" }, { id: "done", label: "Done" },
] as const;
type Status = (typeof COLS)[number]["id"];

/** Four columns. Drag a card by its handle (mouse or finger) or use its "Move to" menu. Done needs an approver. */
export function Kanban({ team, tasks, members, assigned, me, tz, streams = [] }: { team: TeamT; tasks: TaskT[]; members: MemberT[]; assigned: AssignedT[]; me: MeT; tz: string; streams?: { id: string; name: string; color: string }[] }) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, Status>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; over: Status | null } | null>(null);
  const [, start] = useTransition();
  const startXY = useRef<{ x: number; y: number } | null>(null);
  const approver = has(me, "approve");
  const statusOf = (t: TaskT) => (local[t.id] ?? t.status) as Status;

  function move(t: TaskT, to: Status) {
    const from = statusOf(t);
    if (from === to) return;
    if ((to === "done" || from === "done") && !approver) { setMsg("Only the Leader, or someone who can approve work, can move a task to or from Done. Move it to Needs review instead."); return; }
    setLocal((x) => ({ ...x, [t.id]: to })); setMsg(null);
    start(async () => {
      try { await moveTeamTask(t.id, to); router.refresh(); setMsg(`Moved “${t.title || "Untitled task"}” to ${COLS.find((c) => c.id === to)!.label}.`); }
      catch (e) { setLocal((x) => ({ ...x, [t.id]: from })); setMsg(e instanceof Error ? e.message : "Couldn't move it."); }
    });
  }
  const colAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest("[data-col]") as HTMLElement | null)?.dataset.col as Status | undefined;

  return (
    <div>
      <p role="status" aria-live="polite" className="mb-2 min-h-6 text-sm text-muted">{msg}</p>
      <div className="relative flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-[repeat(2,minmax(0,1fr))] sm:px-0 xl:grid-cols-[repeat(4,minmax(0,1fr))]">
        {COLS.map((c) => {
          const items = tasks.filter((t) => statusOf(t) === c.id);
          return (
            <section key={c.id} data-col={c.id} aria-labelledby={`col-${c.id}`}
              className={`grid w-72 min-w-0 shrink-0 snap-start grid-cols-[minmax(0,1fr)] content-start gap-2 rounded-[calc(var(--radius)*2)] border bg-surface/60 p-3 sm:w-auto sm:max-w-none ${drag?.over === c.id ? "border-accent-edge" : "border-line"}`}>
              <h3 id={`col-${c.id}`} className="flex items-center justify-between px-1 font-semibold">{c.label}<span className="text-sm font-normal text-muted tabular-nums">{items.length}</span></h3>
              {items.length === 0 && <p className="rounded-[var(--radius)] border border-dashed border-line px-3 py-6 text-center text-sm text-muted">Nothing here</p>}
              {items.map((t) => {
                const people = assigned.filter((a) => a.taskId === t.id).map((a) => members.find((m) => m.id === a.memberId)).filter((m): m is MemberT => Boolean(m));
                const edge = importanceOf(t.importance, team.importanceColors)?.color;
                const dragging = drag?.id === t.id;
                return (
                  <article key={t.id} className={`grid min-w-0 gap-2 rounded-[var(--radius)] border-2 bg-surface p-3 ${dragging ? "opacity-40" : ""}`} style={{ borderColor: edge ?? "var(--border)" }}>
                    <div className="flex items-start gap-2">
                      <button type="button" aria-label={`Drag “${t.title || "Untitled task"}” to another column`} title="Drag to move"
                        className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-[var(--radius)] text-muted hover:bg-raised active:cursor-grabbing"
                        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startXY.current = { x: e.clientX, y: e.clientY }; setDrag({ id: t.id, x: e.clientX, y: e.clientY, over: statusOf(t) }); }}
                        onPointerMove={(e) => { if (drag?.id === t.id) setDrag({ id: t.id, x: e.clientX, y: e.clientY, over: colAt(e.clientX, e.clientY) ?? null }); }}
                        onPointerUp={(e) => { const to = colAt(e.clientX, e.clientY); setDrag(null); if (to) move(t, to); }}
                        onPointerCancel={() => setDrag(null)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">{[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" />))}</svg>
                      </button>
                      <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 font-medium break-words hover:underline">{t.title || "Untitled task"}</Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-11 text-sm text-muted">
                      <TypeTag type={t.type} custom={team.taskTypes} />
                      {(() => { const st = streams.find((x) => x.id === t.streamId); return st ? <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold"><span aria-hidden className="size-2 rounded-full" style={{ background: st.color }} />{st.name}</span> : null; })()}
                      <ImportanceTag level={t.importance} colors={team.importanceColors} />
                      {t.dueAt && <span>{formatDue(new Date(t.dueAt), t.hasTime, tz)}</span>}
                      {t.subtasks && t.subtasks.total > 0 && <span>{t.subtasks.done}/{t.subtasks.total} subtasks</span>}
                      {t.links ? <span>{t.links} {t.links === 1 ? "link" : "links"}</span> : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 pl-11">
                      <span className="flex -space-x-1.5">{people.slice(0, 5).map((m) => <span key={m.id} title={nameOf(m)}><MemberAvatar m={m} color={team.color} size={24} /></span>)}</span>
                      <label className="sr-only" htmlFor={`mv-${t.id}`}>Move “{t.title || "Untitled task"}” to</label>
                      <select id={`mv-${t.id}`} value={statusOf(t)} onChange={(e) => move(t, e.target.value as Status)} className="min-h-9 max-w-full min-w-0 rounded-[var(--radius)] border border-line bg-bg px-2 text-sm">
                        {COLS.map((o) => <option key={o.id} value={o.id} disabled={!approver && (o.id === "done") !== (statusOf(t) === "done")}>{o.label}</option>)}
                      </select>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
      {drag && (() => { const t = tasks.find((x) => x.id === drag.id); return t ? (
        <div aria-hidden className="pointer-events-none fixed z-50 max-w-64 -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border-2 border-accent-edge bg-raised px-3 py-2 text-sm font-medium shadow-2xl" style={{ left: drag.x, top: drag.y }}>{t.title || "Untitled task"}</div>
      ) : null; })()}
    </div>
  );
}
