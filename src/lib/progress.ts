// Goal progress rolls up from children: tasks count as 0 or 100, child goals by their own progress.
// A goal with no children uses its own "done" toggle or manual 0–100 slider.

export type GoalNode = { id: string; parentId: string | null; manualProgress: number; done: boolean };
export type TaskNode = { goalId: string | null; status: "todo" | "doing" | "done" };

export function computeProgress(goals: GoalNode[], tasks: TaskNode[]): Map<string, number> {
  const childGoals = new Map<string, GoalNode[]>();
  for (const g of goals) if (g.parentId) childGoals.set(g.parentId, [...(childGoals.get(g.parentId) ?? []), g]);
  const childTasks = new Map<string, TaskNode[]>();
  for (const t of tasks) if (t.goalId) childTasks.set(t.goalId, [...(childTasks.get(t.goalId) ?? []), t]);

  const out = new Map<string, number>();
  const visiting = new Set<string>(); // guards against a parent loop in bad data
  const calc = (g: GoalNode): number => {
    const cached = out.get(g.id);
    if (cached !== undefined) return cached;
    if (visiting.has(g.id)) return 0;
    visiting.add(g.id);
    const parts = [
      ...(childGoals.get(g.id) ?? []).map(calc),
      ...(childTasks.get(g.id) ?? []).map((t) => (t.status === "done" ? 100 : 0)),
    ];
    const value = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : g.done ? 100 : g.manualProgress;
    visiting.delete(g.id);
    out.set(g.id, Math.round(value));
    return out.get(g.id)!;
  };
  goals.forEach(calc);
  return out;
}

/** True if making `parentId` the parent of `id` would create a loop. */
export function wouldCycle(goals: { id: string; parentId: string | null }[], id: string, parentId: string | null): boolean {
  const byId = new Map(goals.map((g) => [g.id, g.parentId]));
  for (let cur = parentId, hops = 0; cur && hops < 100; cur = byId.get(cur) ?? null, hops++) if (cur === id) return true;
  return false;
}

export type ActivityGoal = { id: string; parentId: string | null; lastActivityAt: Date; snoozedUntil: Date | null };
export type ActivityTask = { goalId: string | null; updatedAt: Date };

/**
 * Goals that haven't moved in `days`: the goal itself, its tasks and every smaller goal under it all unchanged.
 * Finished (100%) and snoozed goals are left alone.
 */
export function forgottenGoals(goals: ActivityGoal[], tasks: ActivityTask[], progress: Map<string, number>, now: Date, days = 14): string[] {
  const cutoff = now.getTime() - days * 86400000;
  const latest = new Map<string, number>();
  const kids = new Map<string, ActivityGoal[]>();
  for (const g of goals) if (g.parentId) kids.set(g.parentId, [...(kids.get(g.parentId) ?? []), g]);
  const seen = new Set<string>();
  const walk = (g: ActivityGoal): number => {
    if (latest.has(g.id)) return latest.get(g.id)!;
    if (seen.has(g.id)) return 0;
    seen.add(g.id);
    const own = Math.max(g.lastActivityAt.getTime(), ...tasks.filter((t) => t.goalId === g.id).map((t) => t.updatedAt.getTime()));
    const value = Math.max(own, ...(kids.get(g.id) ?? []).map(walk));
    latest.set(g.id, value);
    return value;
  };
  return goals
    .filter((g) => walk(g) < cutoff && (progress.get(g.id) ?? 0) < 100 && !(g.snoozedUntil && g.snoozedUntil.getTime() > now.getTime()))
    // only the biggest forgotten goal in a branch, so one stale year goal doesn't list all its months too
    .filter((g, _, all) => !all.some((p) => p.id === g.parentId))
    .map((g) => g.id);
}
