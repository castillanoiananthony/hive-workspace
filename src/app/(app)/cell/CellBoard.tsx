"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { HexCheck } from "@/components/app/HexCheck";
import { UndoBar, type Undo } from "@/components/app/UndoBar";
import { HexProgress } from "@/components/brand/HexProgress";
import { formatDue } from "@/lib/dates";
import { parseQuickAdd } from "@/lib/quickadd";
import { archiveGoal, newTask, quickAddTask, restoreTask, setTaskStatus } from "./actions";
import { GoalDialog, type GoalDialogMode } from "./GoalDialog";

export type GoalView = { id: string; title: string; level: "year" | "month" | "week"; parentId: string | null; period: string; manualProgress: number; done: boolean; progress: number };
export type TaskView = { id: string; title: string; status: "todo" | "doing" | "done"; goalId: string | null; dueAt: string | null; hasTime: boolean };

const LEVEL = { year: "Year goal", month: "Month goal", week: "Week goal" } as const;

export function CellBoard({ goals, tasks, tz }: { goals: GoalView[]; tasks: TaskView[]; tz: string }) {
  const [dialog, setDialog] = useState<GoalDialogMode | null>(null);
  const [undo, setUndo] = useState<Undo>(null);
  const [, start] = useTransition();
  const ids = useMemo(() => new Set(goals.map((g) => g.id)), [goals]);
  const roots = goals.filter((g) => !g.parentId || !ids.has(g.parentId));
  const loose = tasks.filter((t) => !t.goalId || !ids.has(t.goalId));

  // a task deleted on its own page offers Undo here, where the user lands
  useEffect(() => {
    const raw = sessionStorage.getItem("hive-undo-task");
    if (!raw) return;
    const snap = JSON.parse(raw);
    // cleared only once shown, so a re-run of this effect (React dev mode runs it twice) still finds it
    const t = setTimeout(() => {
      sessionStorage.removeItem("hive-undo-task");
      setUndo({ message: `Deleted “${snap.task.title || "Untitled task"}”.`, undo: () => start(() => restoreTask(snap)) });
    });
    return () => clearTimeout(t);
  }, []);

  const archive = (g: GoalView) =>
    start(async () => {
      await archiveGoal(g.id);
      setUndo({ message: `Archived “${g.title}”.`, undo: () => start(() => archiveGoal(g.id, true)) });
    });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">My Cell</h1>
          <p className="mt-1 text-muted">Your goals and what you&apos;re doing about them this week.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/cell/tasks" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">All tasks</Link>
          <button type="button" onClick={() => setDialog({ kind: "new", parent: null })} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover active:bg-accent-deep">
            New goal
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
      <QuickAdd tz={tz} />

      <section aria-labelledby="ladder" className="mt-8">
        <h2 id="ladder" className="sr-only">Goal ladder</h2>
        {roots.length === 0 ? (
          <EmptyState
            title="No goals yet"
            body="Start with something you want done by the end of the year. Hexley will break it into months and weeks with you."
            action={<button type="button" onClick={() => setDialog({ kind: "new", parent: null })} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent">Add a year goal</button>}
          />
        ) : (
          <ul className="grid gap-4">
            {roots.map((g) => (
              <GoalBranch key={g.id} goal={g} goals={goals} tasks={tasks} tz={tz} depth={0} onEdit={(x) => setDialog({ kind: "edit", goal: x })} onAddChild={(x) => setDialog({ kind: "new", parent: x })} onArchive={archive} />
            ))}
          </ul>
        )}
      </section>

      {loose.length > 0 && (
        <section aria-labelledby="loose" className="mt-10">
          <h2 id="loose" className="font-display text-lg font-semibold">Tasks without a goal</h2>
          <ul className="mt-3 grid gap-1">{loose.map((t) => <TaskRow key={t.id} task={t} tz={tz} />)}</ul>
        </section>
      )}
      </div>
      <UpNext tasks={tasks} tz={tz} />
      </div>

      {dialog && <GoalDialog mode={dialog} goals={goals} onClose={() => setDialog(null)} />}
      <UndoBar value={undo} onClose={() => setUndo(null)} />
    </>
  );
}

function GoalBranch({ goal: g, goals, tasks, tz, depth, onEdit, onAddChild, onArchive }: {
  goal: GoalView; goals: GoalView[]; tasks: TaskView[]; tz: string; depth: number;
  onEdit: (g: GoalView) => void; onAddChild: (g: GoalView) => void; onArchive: (g: GoalView) => void;
}) {
  const kids = goals.filter((c) => c.parentId === g.id);
  const own = tasks.filter((t) => t.goalId === g.id);
  const [open, setOpen] = useState(depth < 2); // year and month open by default, week goals folded
  const [pending, start] = useTransition();
  const canHaveChildren = g.level !== "week";
  const bodyId = `goal-${g.id}`;
  return (
    <li className={depth === 0 ? "rounded-[var(--radius)] border border-line bg-surface" : "relative pl-6 before:absolute before:top-0 before:bottom-0 before:left-[21px] before:w-px before:bg-line"}>
      <div className={`flex items-center gap-3 ${depth === 0 ? "p-4" : "py-2 pl-2"}`}>
        <HexProgress value={g.progress} size={depth === 0 ? 52 : 40} label={`${g.title} progress`} showValue={false} />
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${depth === 0 ? "text-lg" : ""}`}>{g.title}</p>
          <p className="text-sm text-muted">
            {LEVEL[g.level]}, {g.period}. {g.progress}% done{kids.length + own.length ? `, ${kids.length + own.length} inside` : ""}
          </p>
        </div>
        <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)} className="min-h-11 rounded-[var(--radius)] px-3 text-sm text-muted hover:text-ink">
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open && (
        <div id={bodyId} className={depth === 0 ? "border-t border-line px-4 pb-4" : "pl-2"}>
          {kids.length > 0 && (
            <ul className="mt-2 grid gap-1">
              {kids.map((c) => <GoalBranch key={c.id} goal={c} goals={goals} tasks={tasks} tz={tz} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} onArchive={onArchive} />)}
            </ul>
          )}
          {own.length > 0 && <ul className="mt-2 grid gap-1">{own.map((t) => <TaskRow key={t.id} task={t} tz={tz} />)}</ul>}
          <div className="mt-2 flex flex-wrap gap-x-1 text-sm">
            <button type="button" disabled={pending} onClick={() => start(() => newTask(g.id))} className="min-h-11 px-2 font-medium text-accent-text">Add task</button>
            {canHaveChildren && <button type="button" onClick={() => onAddChild(g)} className="min-h-11 px-2 text-muted hover:text-ink">Add {g.level === "year" ? "month" : "week"} goal</button>}
            <button type="button" onClick={() => onEdit(g)} className="min-h-11 px-2 text-muted hover:text-ink">Edit</button>
            <button type="button" onClick={() => onArchive(g)} className="min-h-11 px-2 text-muted hover:text-ink">Archive</button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Right-hand column on wide screens (below the ladder on narrow ones): overdue and due-this-week tasks. */
function UpNext({ tasks, tz }: { tasks: TaskView[]; tz: string }) {
  const [now] = useState(() => Date.now());
  const soon = tasks
    .filter((t) => t.status !== "done" && t.dueAt && new Date(t.dueAt).getTime() < now + 7 * 86400000)
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
  const doneCount = tasks.filter((t) => t.status === "done").length;
  return (
    <aside aria-labelledby="upnext" className="self-start rounded-[var(--radius)] border border-line bg-surface p-5 xl:sticky xl:top-8">
      <h2 id="upnext" className="font-display text-lg font-semibold">Up next</h2>
      <p className="mt-1 text-sm text-muted">Overdue and due in the next 7 days.</p>
      {soon.length === 0
        ? <p className="mt-4 text-muted">Nothing due this week. Add a date to a task and it shows up here.</p>
        : <ul className="mt-3 grid gap-1">{soon.map((t) => <TaskRow key={t.id} task={t} tz={tz} />)}</ul>}
      <p className="mt-5 border-t border-line pt-4 text-sm text-muted">{doneCount} of {tasks.length} tasks done in total.</p>
    </aside>
  );
}

export function TaskRow({ task: t, tz }: { task: TaskView; tz: string }) {
  const [done, setDone] = useState(t.status === "done");
  const [, start] = useTransition();
  const overdue = !done && t.dueAt && new Date(t.dueAt) < new Date();
  return (
    <li className="flex items-center gap-1">
      <HexCheck checked={done} label={`Mark “${t.title || "Untitled task"}” done`} onChange={(v) => { setDone(v); start(() => setTaskStatus(t.id, v ? "done" : "todo")); }} />
      <Link href={`/tasks/${t.id}`} className="min-h-11 flex-1 py-2 hover:underline">
        <span className={done ? "text-muted line-through" : undefined}>{t.title || "Untitled task"}</span>
        {t.dueAt && (
          <span className={`ml-2 inline-block text-sm whitespace-nowrap ${overdue ? "text-danger" : "text-muted"}`}>
            {overdue ? "Overdue, " : ""}{formatDue(new Date(t.dueAt), t.hasTime, tz)}
          </span>
        )}
      </Link>
    </li>
  );
}

function QuickAdd({ tz }: { tz: string }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<{ text: string; id?: string } | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const preview = value.trim() ? parseQuickAdd(value, tz) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    start(async () => {
      try {
        const r = await quickAddTask(value);
        setStatus({ text: `Added “${r.title}”${r.dueAt ? `, due ${formatDue(new Date(r.dueAt), r.hasTime, tz)}` : ""}.`, id: r.id });
        setValue("");
        input.current?.focus();
      } catch (err) {
        setStatus({ text: err instanceof Error ? err.message : "Couldn't add that task." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label htmlFor="quick" className="text-sm font-medium">Quick add a task</label>
      <div className="mt-2 flex gap-2">
        <input
          ref={input} id="quick" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Submit lab report Fri 5pm" autoComplete="off"
          aria-describedby="quick-hint"
          className="min-h-12 min-w-0 flex-1 rounded-[var(--radius)] border border-line bg-surface px-3 text-base placeholder:text-muted focus:border-accent-edge"
        />
        <button disabled={pending || !value.trim()} className="min-h-12 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-50">Add</button>
      </div>
      <p id="quick-hint" className="mt-2 min-h-6 text-sm text-muted" aria-live="polite">
        {preview?.dueAt
          ? <>Due <span className="text-ink">{formatDue(preview.dueAt, preview.hasTime, tz)}</span>. Title: <span className="text-ink">{preview.title}</span></>
          : status
            ? <>{status.text} {status.id && <Link href={`/tasks/${status.id}`} className="text-accent-text underline underline-offset-4">Open it</Link>}</>
            : "Type a date like “tomorrow” or “Fri 5pm” and it becomes the due date."}
      </p>
    </form>
  );
}
