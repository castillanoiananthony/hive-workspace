import "server-only";
import { and, asc, eq, gte, isNull, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignment, subject, task, team, teamMember } from "@/db/schema";
import { recordContribution } from "./contributions";
import { formatDue } from "./dates";
import { doneAtFor, syncTaskStatus } from "./task-status";

/** What the offline page shows: your open personal tasks and your open parts of team tasks (plus anything finished today). */
export async function offlineSnapshot(me: { id: string; timezone: string }) {
  const recent = new Date(Date.now() - 86_400_000);
  const [own, parts] = await Promise.all([
    db.select({ t: task, color: subject.color, code: subject.code }).from(task).leftJoin(subject, eq(task.subjectId, subject.id))
      .where(and(eq(task.ownerId, me.id), isNull(task.teamId), or(ne(task.status, "done"), gte(task.doneAt, recent)))).orderBy(asc(task.dueAt)).limit(300),
    db.select({ a: assignment, title: task.title, dueAt: task.dueAt, hasTime: task.hasTime, team: team.name, color: team.color }).from(assignment)
      .innerJoin(teamMember, eq(assignment.memberId, teamMember.id)).innerJoin(task, eq(assignment.taskId, task.id)).innerJoin(team, eq(task.teamId, team.id))
      .where(and(eq(teamMember.userId, me.id), or(isNull(assignment.doneAt), gte(assignment.doneAt, recent)))).limit(300),
  ]);
  const due = (d: Date | null, t: boolean) => (d ? formatDue(d, t, me.timezone) : null);
  return [
    ...own.map(({ t, color, code }) => ({ key: `task:${t.id}`, type: "task" as const, id: t.id, title: t.title || "Untitled task", context: code ?? "My Cell", due: due(t.dueAt, t.hasTime), done: t.status === "done", color: color ?? null })),
    ...parts.map((p) => ({ key: `part:${p.a.id}`, type: "part" as const, id: p.a.id, title: p.title || "Untitled task", context: p.team, due: due(p.dueAt, p.hasTime), done: Boolean(p.a.doneAt), color: p.color })),
  ];
}

export type Op = { type: "task" | "part"; id: string; done: boolean; at: string };

/** Applies check-offs made offline. Newest change wins: if the task was changed on the server after the tick, the tick is skipped and reported. */
export async function applyOps(me: { id: string }, ops: Op[]) {
  const applied: string[] = [], conflicts: string[] = [];
  for (const op of ops.slice(0, 200)) {
    const at = new Date(op.at);
    if (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 5 * 60_000) continue;
    if (op.type === "task") {
      const [t] = await db.select().from(task).where(and(eq(task.id, String(op.id)), eq(task.ownerId, me.id), isNull(task.teamId)));
      if (!t) continue;
      if ((t.status === "done") === Boolean(op.done)) { applied.push(t.title); continue; }
      if (t.updatedAt > at) { conflicts.push(t.title || "Untitled task"); continue; }
      const status = op.done ? "done" : "todo";
      await db.update(task).set({ status, doneAt: doneAtFor(status) }).where(eq(task.id, t.id));
      applied.push(t.title);
    } else {
      const [r] = await db.select({ a: assignment, t: task }).from(assignment).innerJoin(teamMember, eq(assignment.memberId, teamMember.id)).innerJoin(task, eq(assignment.taskId, task.id))
        .where(and(eq(assignment.id, String(op.id)), eq(teamMember.userId, me.id)));
      if (!r) continue;
      if (Boolean(r.a.doneAt) === Boolean(op.done)) { applied.push(r.t.title); continue; }
      if (r.a.doneAt && r.a.doneAt > at) { conflicts.push(r.t.title || "Untitled task"); continue; }
      await db.update(assignment).set({ doneAt: op.done ? at : null, progress: op.done ? 100 : Math.min(r.a.progress, 99) }).where(eq(assignment.id, r.a.id));
      if (op.done) await recordContribution({ teamId: r.t.teamId!, memberId: r.a.memberId, kind: "part_done", what: r.t.title, taskId: r.t.id });
      await syncTaskStatus(r.t.id);
      revalidatePath(`/hive/${r.t.teamId}`);
      applied.push(r.t.title);
    }
  }
  revalidatePath("/cell"); revalidatePath("/home");
  return { applied: applied.length, conflicts };
}
