"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createGoal, updateGoal } from "./actions";
import type { GoalView } from "./CellBoard";

export type GoalDialogMode = { kind: "new"; parent: GoalView | null } | { kind: "edit"; goal: GoalView };
const RANK = { year: 0, month: 1, week: 2 } as const;
const NEXT = { year: "month", month: "week", week: "week" } as const;

export function GoalDialog({ mode, goals, onClose }: { mode: GoalDialogMode; goals: GoalView[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const editing = mode.kind === "edit" ? mode.goal : null;
  const [level, setLevel] = useState<GoalView["level"]>(editing?.level ?? (mode.kind === "new" && mode.parent ? NEXT[mode.parent.level] : "year"));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isLeaf = editing ? !goals.some((g) => g.parentId === editing.id) : false;

  useEffect(() => { ref.current?.showModal(); }, []);
  // only bigger goals can be a parent, and never the goal itself
  const parents = goals.filter((g) => RANK[g.level] < RANK[level] && g.id !== editing?.id);
  const defaultParent = editing ? editing.parentId ?? "" : mode.kind === "new" ? mode.parent?.id ?? "" : "";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parentId = String(f.get("parent") || "") || null;
    setError(null);
    start(async () => {
      try {
        if (editing) {
          await updateGoal(editing.id, {
            title: String(f.get("title")), parentId,
            ...(isLeaf ? { manualProgress: Number(f.get("progress")), done: f.get("done") === "on" } : {}),
          });
        } else {
          await createGoal({ title: String(f.get("title")), level, parentId });
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the goal.");
      }
    });
  }

  const field = "min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="goal-dialog-title" className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-[var(--radius)] border border-line bg-raised p-0 text-ink backdrop:bg-black/60">
      <form onSubmit={submit} className="grid gap-4 p-6">
        <h2 id="goal-dialog-title" className="font-display text-xl font-semibold">{editing ? "Edit goal" : "New goal"}</h2>

        <label className="grid gap-2"><span className="text-sm font-medium">Goal</span>
          <input name="title" required maxLength={200} defaultValue={editing?.title} autoFocus className={field} placeholder="Get my driver's licence" />
        </label>

        {!editing && (
          <fieldset><legend className="mb-2 text-sm font-medium">How big is it?</legend>
            <div className="flex flex-wrap gap-2">
              {(["year", "month", "week"] as const).map((l) => (
                <label key={l} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-line px-3 has-checked:border-accent-edge has-checked:bg-surface">
                  <input type="radio" name="level" value={l} checked={level === l} onChange={() => setLevel(l)} className="accent-[var(--accent)]" />
                  This {l}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {level !== "year" && (
          <label className="grid gap-2"><span className="text-sm font-medium">Part of</span>
            <select name="parent" defaultValue={defaultParent} className={field}>
              <option value="">Nothing (stands on its own)</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.level})</option>)}
            </select>
          </label>
        )}

        {editing && isLeaf && (
          <div className="grid gap-3 rounded-[var(--radius)] border border-line p-4">
            <p className="text-sm text-muted">This goal has no tasks or smaller goals yet, so you set its progress yourself.</p>
            <label className="grid gap-2"><span className="text-sm font-medium">Progress</span>
              <input type="range" name="progress" min={0} max={100} step={5} defaultValue={editing.manualProgress} className="accent-[var(--accent)]" />
            </label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="done" defaultChecked={editing.done} className="size-5 accent-[var(--accent)]" /> It&apos;s done</label>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="min-h-11 rounded-[var(--radius)] border border-line px-4 text-muted hover:border-accent-edge hover:text-ink">Cancel</button>
          <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">
            {pending ? "Saving…" : editing ? "Save changes" : "Add goal"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
