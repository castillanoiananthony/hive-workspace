import "server-only";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignment, task, team, teamMember } from "@/db/schema";
import { recordContribution } from "./contributions";
import { syncTaskStatus } from "./task-status";
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
  if (done && !r.a.doneAt) {
    await db.update(assignment).set({ doneAt: new Date(), progress: 100 }).where(eq(assignment.id, r.a.id));
    await recordContribution({ teamId: r.teamId, memberId: r.a.memberId, kind: "part_done", what: r.title, taskId: r.taskId });
  }
  if (!done && r.a.doneAt) await db.update(assignment).set({ doneAt: null, progress: Math.min(r.a.progress, 99) }).where(eq(assignment.id, r.a.id));
  await syncTaskStatus(r.taskId); // everyone done → Needs Review for the Leader
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
