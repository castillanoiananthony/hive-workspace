import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignment, task, team, teamMember } from "@/db/schema";
import { hashToken } from "./tokens";

// What a teammate (no account) can do from an email link. The token is the only credential.

export async function findAssignment(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await db.select({ a: assignment, title: task.title, taskId: task.id, teamId: team.id, team: team.name, member: teamMember.name })
    .from(assignment).innerJoin(task, eq(assignment.taskId, task.id)).innerJoin(team, eq(task.teamId, team.id)).innerJoin(teamMember, eq(assignment.memberId, teamMember.id))
    .where(eq(assignment.doneTokenHash, hashToken(token)));
  return row ?? null;
}

/** Marks (or un-marks) this one person's part. Idempotent: clicking twice keeps the first time. */
export async function setDone(token: string, done: boolean) {
  const r = await findAssignment(token);
  if (!r) return null;
  if (done && !r.a.doneAt) await db.update(assignment).set({ doneAt: new Date() }).where(eq(assignment.id, r.a.id));
  if (!done && r.a.doneAt) await db.update(assignment).set({ doneAt: null }).where(eq(assignment.id, r.a.id));
  // the task itself is done when everyone assigned is done
  const open = await db.select({ id: assignment.id }).from(assignment).where(and(eq(assignment.taskId, r.taskId), isNull(assignment.doneAt)));
  await db.update(task).set({ status: open.length === 0 ? "done" : "todo" }).where(eq(task.id, r.taskId));
  revalidatePath(`/hive/${r.teamId}`);
  return { title: r.title || "Untitled task", team: r.team, member: r.member, done, already: done && Boolean(r.a.doneAt) };
}

export async function findMember(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await db.select({ m: teamMember, team: team.name }).from(teamMember).innerJoin(team, eq(teamMember.teamId, team.id)).where(eq(teamMember.unsubscribeTokenHash, hashToken(token)));
  return row ?? null;
}

export async function setSubscribed(token: string, subscribed: boolean) {
  const r = await findMember(token);
  if (!r) return null;
  await db.update(teamMember).set({ unsubscribedAt: subscribed ? null : new Date() }).where(eq(teamMember.id, r.m.id));
  revalidatePath(`/hive/${r.m.teamId}`);
  return { team: r.team, subscribed };
}
