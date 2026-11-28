"use client";
import { useMemo, useState, useTransition } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { newTask } from "../actions";
import { TaskRow, type TaskView } from "../CellBoard";
import { SubjectFilter, SubjectsContext, type Subject } from "../Life";

type Due = "any" | "overdue" | "week" | "none";

export function TaskList({ tasks, goals, tz, subjects = [] }: { tasks: (TaskView & { updatedAt: string })[]; goals: { id: string; title: string }[]; tz: string; subjects?: Subject[] }) {
  const [subj, setSubj] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"any" | TaskView["status"]>("any");
  const [goalId, setGoalId] = useState("any");
  const [due, setDue] = useState<Due>("any");
  const [pending, start] = useTransition();
  const [now] = useState(() => Date.now()); // fixed for this visit so filters are stable

  const shown = useMemo(() => {
    const week = now + 7 * 86400000, needle = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (needle && !t.title.toLowerCase().includes(needle)) return false;
      if (subj && t.subjectId !== subj) return false;
      if (status !== "any" && t.status !== status) return false;
      if (goalId === "none" ? t.goalId : goalId !== "any" && t.goalId !== goalId) return false;
      const d = t.dueAt ? new Date(t.dueAt).getTime() : null;
      if (due === "overdue") return d !== null && d < now && t.status !== "done";
      if (due === "week") return d !== null && d >= now && d <= week;
      if (due === "none") return d === null;
      return true;
    });
  }, [tasks, q, status, goalId, due, now, subj]);

  const field = "min-h-11 rounded-[var(--radius)] border border-line bg-surface px-3 text-base focus:border-accent-edge";
  const filtered = q || status !== "any" || goalId !== "any" || due !== "any" || subj;
  return (
    <SubjectsContext.Provider value={subjects}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display mt-1 text-3xl font-semibold">All tasks</h1>
        </div>
        <button type="button" disabled={pending} onClick={() => start(() => newTask())} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">New task</button>
      </div>

      <div role="search" className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="sr-only" htmlFor="q">Search tasks</label>
        <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className={field} />
        <label className="sr-only" htmlFor="f-status">Status</label>
        <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={field}>
          <option value="any">Any status</option><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option>
        </select>
        <label className="sr-only" htmlFor="f-goal">Goal</label>
        <select id="f-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} className={field}>
          <option value="any">Any goal</option><option value="none">No goal</option>
          {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-due">Due date</label>
        <select id="f-due" value={due} onChange={(e) => setDue(e.target.value as Due)} className={field}>
          <option value="any">Any due date</option><option value="overdue">Overdue</option><option value="week">Due in the next 7 days</option><option value="none">No due date</option>
        </select>
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">{shown.length} {shown.length === 1 ? "task" : "tasks"}</p>
      {shown.length === 0 ? (
        <div className="mt-4">
          {filtered
            ? <EmptyState pose="idle" title="Nothing matches" body="Try a different word or clear the filters." action={<button type="button" onClick={() => { setQ(""); setStatus("any"); setGoalId("any"); setDue("any"); }} className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium">Clear filters</button>} />
            : <EmptyState title="No tasks yet" body="Tasks are the small steps toward your goals. Add one with quick add on My Cell, or start a blank one here." />}
        </div>
      ) : (
        <ul className="mt-2 grid divide-y divide-line rounded-[var(--radius)] border border-line bg-surface px-2">{shown.map((t) => <TaskRow key={t.id} task={t} tz={tz} />)}</ul>
      )}
      <SubjectFilter value={subj} onChange={setSubj} />
    </SubjectsContext.Provider>
  );
}
