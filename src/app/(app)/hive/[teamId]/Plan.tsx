"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { countdown } from "@/lib/hive-templates";
import { addChecklistItem, addHiveMilestone, addTeamChecklist, deleteChecklistItem, deleteHiveMilestone, deleteTeamChecklist, tickChecklistItem, updateChecklistItem, updateHiveMilestone } from "../dev-actions";
import { has, nameOf, type ChecklistT, type CriterionT, type HiveMilestoneT, type MeT, type MemberT, type TaskT, type TeamT } from "./types";
import { addCriteria, deleteCriterion, linkCriterion } from "../team-extras-actions";
import Link from "next/link";

const card = "rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5";
const field = "min-h-11 min-w-0 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
const outline = "min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge disabled:opacity-60";

/** Next unfinished milestone, ticking down live: days and hours, or hours and minutes for hackathons. */
export function Countdown({ milestones, hourly }: { milestones: HiveMilestoneT[]; hourly: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock only starts in the browser
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), hourly ? 30_000 : 60_000);
    return () => clearInterval(t);
  }, [hourly]);
  const next = milestones.filter((m) => !m.done && m.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0];
  if (!next || now === null) return null;
  const c = countdown(new Date(next.dueAt!).getTime() - now, hourly);
  const done = milestones.filter((m) => m.done).length;
  return (
    <div role="timer" aria-live="off" className={`mb-5 grid gap-1 rounded-[calc(var(--radius)*2)] border-2 px-5 py-4 ${c.late ? "border-danger/70 bg-danger/10" : "border-accent-edge/70 bg-accent/10"}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0"><span className="block text-sm text-muted">Next milestone</span><span className="block font-display text-lg font-semibold [overflow-wrap:anywhere]">{next.title}</span></div>
        <span className={`font-display text-2xl font-semibold whitespace-nowrap tabular-nums ${c.late ? "text-danger" : "text-accent-text"}`}>{c.late ? `${c.text} late` : c.text}</span>
      </div>
      <span className="text-sm text-muted">Due {next.label}. {done} of {milestones.length} milestones done.</span>
    </div>
  );
}

/** The Milestones tab: milestones and the team's checklists (each item can have one owner). */
export function Plan({ team, me, members, milestones, checklists, criteria = [], tasks = [] }: { team: TeamT; me: MeT; members: MemberT[]; milestones: HiveMilestoneT[]; checklists: ChecklistT[]; criteria?: CriterionT[]; tasks?: TaskT[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const edit = has(me, "tasks") && !team.archived;
  const hourly = team.kind === "hackathon";
  const run = (fn: () => Promise<unknown>) => start(async () => { try { await fn(); setMsg(null); router.refresh(); } catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't save."); } });
  const owners = members.filter((m) => (m.access ?? "member") === "member");
  const nm = (id: string | null) => { const m = members.find((x) => x.id === id); return m ? nameOf(m) : null; };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby="ms-h" className={card}>
        <h2 id="ms-h" className="font-display text-lg font-semibold">Milestones</h2>
        {milestones.length === 0 && <p className="mt-2 text-sm text-muted">No milestones yet.{edit ? " Add the checkpoints you're working towards." : ""}</p>}
        <ol className="mt-3 grid gap-2">
          {milestones.map((m) => (
            <li key={m.id} className="grid gap-2 rounded-[var(--radius)] border border-line p-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={ticks[m.id] ?? m.done} disabled={!edit || pending} aria-label={`${m.title} reached`} onChange={(e) => { const v = e.target.checked; setTicks((x) => ({ ...x, [m.id]: v })); run(() => updateHiveMilestone(m.id, { done: v })); }} className="size-5 shrink-0 accent-[var(--accent)]" />
                <span className={`min-w-0 flex-1 font-medium ${(ticks[m.id] ?? m.done) ? "text-muted line-through" : ""}`}>{m.title}</span>
                <span className="text-sm whitespace-nowrap text-muted">{m.label ?? "No date"}</span>
              </div>
              {edit && (
                <div className="flex flex-wrap gap-2 pl-8">
                  <label className="sr-only" htmlFor={`msd-${m.id}`}>{m.title} date</label>
                  <input id={`msd-${m.id}`} type="date" defaultValue={m.date ?? ""} onChange={(e) => run(() => updateHiveMilestone(m.id, { date: e.target.value, time: m.time ?? "" }))} className={`${field} min-h-10 text-sm`} />
                  {(hourly || m.hasTime) && <><label className="sr-only" htmlFor={`mst-${m.id}`}>{m.title} time</label><input id={`mst-${m.id}`} type="time" defaultValue={m.time ?? ""} onChange={(e) => run(() => updateHiveMilestone(m.id, { date: m.date ?? "", time: e.target.value }))} className={`${field} min-h-10 text-sm`} /></>}
                  <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove the milestone “${m.title}”?`)) run(() => deleteHiveMilestone(m.id)); }} className={`${outline} min-h-10 hover:border-danger hover:text-danger`}>Remove</button>
                </div>
              )}
            </li>
          ))}
        </ol>
        {edit && (
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget), form = e.currentTarget; run(async () => { await addHiveMilestone(team.id, { title: String(f.get("t")), date: String(f.get("d")), time: String(f.get("h") ?? "") }); form.reset(); }); }}>
            <label className="sr-only" htmlFor="new-ms">New milestone</label>
            <input id="new-ms" name="t" required maxLength={120} placeholder="New milestone" className={`${field} flex-1 basis-40`} />
            <label className="sr-only" htmlFor="new-ms-d">Date</label><input id="new-ms-d" name="d" type="date" className={field} />
            {hourly && <><label className="sr-only" htmlFor="new-ms-h">Time</label><input id="new-ms-h" name="h" type="time" className={field} /></>}
            <button disabled={pending} className={`${outline} border-accent-edge/70 text-accent-text`}>Add</button>
          </form>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        {checklists.map((c) => {
          const done = c.items.filter((i) => ticks[i.id] ?? i.done).length;
          return (
            <section key={c.id} aria-labelledby={`cl-${c.id}`} className={card}>
              <div className="flex items-center justify-between gap-3">
                <h2 id={`cl-${c.id}`} className="font-display text-lg font-semibold">{c.title} <span className="text-sm font-normal text-muted">{done} of {c.items.length}</span></h2>
                {edit && <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete the “${c.title}” checklist?`)) run(() => deleteTeamChecklist(c.id)); }} className={`${outline} min-h-9 px-3 hover:border-danger hover:text-danger`}>Delete</button>}
              </div>
              <ul className="mt-3 grid gap-2">
                {c.items.map((i) => {
                  const mine = i.ownerId === me.memberId, isDone = ticks[i.id] ?? i.done;
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius)] border border-line px-3 py-2">
                      <input type="checkbox" checked={isDone} disabled={(!mine && !edit) || pending || Boolean(team.archived)} aria-label={`${i.text} done`} onChange={(e) => { const v = e.target.checked; setTicks((x) => ({ ...x, [i.id]: v })); run(() => tickChecklistItem(i.id, v)); }} className="size-5 shrink-0 accent-[var(--accent)]" />
                      <span className={`min-w-0 flex-1 basis-40 ${isDone ? "text-muted line-through" : ""}`}>{i.text}</span>
                      {edit ? (
                        <>
                          <label className="sr-only" htmlFor={`own-${i.id}`}>Owner of {i.text}</label>
                          <select id={`own-${i.id}`} value={i.ownerId ?? ""} disabled={pending} onChange={(e) => run(() => updateChecklistItem(i.id, { ownerId: e.target.value }))} className={`${field} min-h-9 max-w-48 text-sm`}>
                            <option value="">No owner</option>{owners.map((m) => <option key={m.id} value={m.id}>{nameOf(m)}</option>)}
                          </select>
                          <button type="button" aria-label={`Remove ${i.text}`} disabled={pending} onClick={() => run(() => deleteChecklistItem(i.id))} className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-danger">×</button>
                        </>
                      ) : <span className="text-sm text-muted">{nm(i.ownerId) ?? "No owner"}</span>}
                    </li>
                  );
                })}
              </ul>
              {edit && (
                <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget, v = String(new FormData(form).get("t")); run(async () => { await addChecklistItem(c.id, { text: v }); form.reset(); }); }}>
                  <label className="sr-only" htmlFor={`add-${c.id}`}>Add an item to {c.title}</label>
                  <input id={`add-${c.id}`} name="t" required maxLength={200} placeholder="Add an item" className={`${field} min-w-0 flex-1`} />
                  <button disabled={pending} className={outline}>Add</button>
                </form>
              )}
            </section>
          );
        })}
        {edit && (
          <div className="flex flex-wrap gap-2">
            {!checklists.some((c) => c.title === "Submission") && <button type="button" disabled={pending} onClick={() => run(() => addTeamChecklist(team.id, { preset: "submission" }))} className={outline}>+ Submission checklist</button>}
            {!checklists.some((c) => c.title.startsWith("Pitch")) && <button type="button" disabled={pending} onClick={() => run(() => addTeamChecklist(team.id, { preset: "pitch" }))} className={outline}>+ Pitch / demo prep</button>}
            <button type="button" disabled={pending} onClick={() => { const t = prompt("Checklist name"); if (t?.trim()) run(() => addTeamChecklist(team.id, { title: t })); }} className={outline}>+ New checklist</button>
          </div>
        )}
        {checklists.length === 0 && !edit && <p className="text-sm text-muted">No checklists yet.</p>}
        {(criteria.length > 0 || (edit && team.kind !== "project")) && (
          <section aria-labelledby="crit-h" className={card}>
            <h2 id="crit-h" className="font-display text-lg font-semibold">Judging criteria</h2>
            <p className="text-sm text-muted">Link tasks to each criterion so nothing the judges look for is missed.</p>
            <ul className="mt-3 grid gap-2">
              {criteria.map((c) => {
                const linked = tasks.filter((t) => c.taskIds.includes(t.id)), free = tasks.filter((t) => !c.taskIds.includes(t.id));
                return (
                  <li key={c.id} className={`grid gap-2 rounded-[var(--radius)] border p-3 ${linked.length ? "border-line" : "border-danger/60"}`}>
                    <div className="flex items-start gap-2"><p className="min-w-0 flex-1 font-medium">{c.text}</p>{edit && <button type="button" aria-label={`Remove “${c.text}”`} disabled={pending} onClick={() => run(() => deleteCriterion(c.id))} className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-danger">×</button>}</div>
                    {linked.length === 0 && <p className="text-sm font-medium text-danger">Nothing covers this yet</p>}
                    {linked.length > 0 && <p className="flex flex-wrap gap-1.5">{linked.map((t) => <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-line py-0.5 pr-1 pl-2 text-sm"><Link href={`/tasks/${t.id}`} className="hover:underline">{t.title || "Untitled task"}</Link>{edit && <button type="button" aria-label={`Unlink ${t.title}`} onClick={() => run(() => linkCriterion(c.id, t.id, false))} className="grid size-6 place-items-center rounded-full text-muted hover:text-danger">×</button>}</span>)}</p>}
                    {edit && free.length > 0 && <><label className="sr-only" htmlFor={`cr-${c.id}`}>Link a task to “{c.text}”</label><select id={`cr-${c.id}`} value="" onChange={(e) => e.target.value && run(() => linkCriterion(c.id, e.target.value, true))} className={`${field} min-h-10 text-sm`}><option value="">+ Link a task…</option>{free.map((t) => <option key={t.id} value={t.id}>{t.title || "Untitled task"}</option>)}</select></>}
                  </li>
                );
              })}
            </ul>
            {edit && (
              <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget, v = String(new FormData(form).get("c")); run(async () => { await addCriteria(team.id, v); form.reset(); }); }}>
                <label htmlFor="crit-add" className="text-sm font-medium">Paste the criteria, one per line</label>
                <textarea id="crit-add" name="c" rows={3} required placeholder={"Impact\nCreativity\nTechnical difficulty\nPresentation"} className={`${field} py-2`} />
                <button disabled={pending} className={`${outline} justify-self-start`}>Add criteria</button>
              </form>
            )}
          </section>
        )}
        <p role="status" className="text-sm text-danger">{msg}</p>
      </div>
    </div>
  );
}
