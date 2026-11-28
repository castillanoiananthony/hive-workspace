"use server";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignment, subtask, task, taskComment, teamMember } from "@/db/schema";
import { recordContribution } from "@/lib/contributions";
import { zonedToUtc } from "@/lib/dates";
import { can, canComment } from "@/lib/hive-perms";
import { requireUser } from "@/lib/session";
import { requireAdmin, teamAccess } from "@/lib/teams";
import { doneAtFor } from "@/lib/task-status";

const STATUSES = ["todo", "doing", "review", "done"] as const;
type Status = (typeof STATUSES)[number];
const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
const refresh = (teamId: string, taskId?: string) => {
  revalidatePath(`/hive/${teamId}`); revalidatePath(`/hive/${teamId}/progress`); revalidatePath(`/hive/${teamId}/contributions`);
  if (taskId) revalidatePath(`/tasks/${taskId}`);
};

async function teamTask(userId: string, taskId: string) {
  const [t] = await db.select().from(task).where(eq(task.id, taskId));
  if (!t?.teamId) throw new Error("That task no longer exists.");
  const a = await teamAccess(userId, t.teamId);
  return { t, ...a };
}

/**
 * Kanban move. Anyone working on the task (assigned, owns a subtask) or with the tasks power can move it between
 * To do, Doing and Needs Review; only approvers (the Leader, or the "Approve work" power) can move it to Done or back out of it.
 */
export async function moveTeamTask(taskId: string, status: Status) {
  const me = await requireUser();
  if (!STATUSES.includes(status)) throw new Error("Unknown status.");
  const { t, me: m } = await teamTask(me.id, taskId);
  if (t.status === status) return;
  const approver = can(m, "approve");
  if ((status === "done" || t.status === "done") && !approver) throw new Error("Only the Leader (or someone who can approve work) can move a task to or from Done. Move it to Needs Review instead.");
  if (!approver && !can(m, "tasks")) {
    const [mine] = await db.select({ id: assignment.id }).from(assignment).where(and(eq(assignment.taskId, taskId), eq(assignment.memberId, m.id)));
    const [own] = mine ? [mine] : await db.select({ id: subtask.id }).from(subtask).where(and(eq(subtask.taskId, taskId), eq(subtask.ownerId, m.id)));
    if (!own) throw new Error("Only people working on this task can move it.");
  }
  await db.update(task).set({ status, doneAt: doneAtFor(status) }).where(eq(task.id, taskId));
  if (status === "review") await recordContribution({ teamId: t.teamId!, memberId: m.id, kind: "sent_for_review", what: t.title, taskId });
  if (status === "done") await recordContribution({ teamId: t.teamId!, memberId: m.id, kind: "approved", what: t.title, taskId });
  refresh(t.teamId!, taskId);
}

// ---------- subtasks ----------

function dueFrom(date: unknown, time: unknown, tz: string) {
  const d = clean(date, 10), tm = clean(time, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { dueAt: null, hasTime: false };
  return { dueAt: zonedToUtc(d, /^\d{2}:\d{2}$/.test(tm) ? tm : null, tz), hasTime: /^\d{2}:\d{2}$/.test(tm) };
}

async function ownerIn(teamId: string, ownerId: unknown) {
  const id = clean(ownerId, 64);
  if (!id) return null;
  const [o] = await db.select({ id: teamMember.id, access: teamMember.access }).from(teamMember).where(and(eq(teamMember.id, id), eq(teamMember.teamId, teamId)));
  if (!o) throw new Error("That person isn't in this team.");
  if (o.access !== "member") throw new Error("Advisers and guests can't own subtasks.");
  return o.id;
}

export async function addSubtask(taskId: string, input: { title: string; ownerId: string; date?: string; time?: string }) {
  const me = await requireUser();
  const { t, me: m } = await teamTask(me.id, taskId);
  if (!can(m, "tasks")) throw new Error("You don't have permission to split this task. Ask the team's admin.");
  const title = clean(input.title, 200);
  if (!title) throw new Error("Give the subtask a name.");
  const count = await db.select({ id: subtask.id }).from(subtask).where(eq(subtask.taskId, taskId));
  if (count.length >= 50) throw new Error("A task can have up to 50 subtasks.");
  await db.insert(subtask).values({ taskId, title, ownerId: await ownerIn(t.teamId!, input.ownerId), ...dueFrom(input.date, input.time, me.timezone), position: count.length });
  refresh(t.teamId!, taskId);
}

export async function updateSubtask(id: string, input: { title?: string; ownerId?: string; date?: string; time?: string }) {
  const me = await requireUser();
  const [s] = await db.select().from(subtask).where(eq(subtask.id, id));
  if (!s) throw new Error("That subtask no longer exists.");
  const { t, me: m } = await teamTask(me.id, s.taskId);
  if (!can(m, "tasks")) throw new Error("You don't have permission to edit subtasks.");
  const set: Partial<typeof subtask.$inferInsert> = {};
  if (input.title !== undefined) { set.title = clean(input.title, 200); if (!set.title) throw new Error("A subtask needs a name."); }
  if (input.ownerId !== undefined) set.ownerId = await ownerIn(t.teamId!, input.ownerId);
  if (input.date !== undefined) Object.assign(set, dueFrom(input.date, input.time, me.timezone));
  await db.update(subtask).set(set).where(eq(subtask.id, id));
  refresh(t.teamId!, s.taskId);
}

/** The owner (or anyone with the tasks power) ticks a subtask done or not done. Done is logged as a contribution. */
export async function setSubtaskDone(id: string, done: boolean) {
  const me = await requireUser();
  const [s] = await db.select().from(subtask).where(eq(subtask.id, id));
  if (!s) throw new Error("That subtask no longer exists.");
  const { t, me: m } = await teamTask(me.id, s.taskId);
  if (s.ownerId !== m.id && !can(m, "tasks")) throw new Error("Only the subtask's owner can tick it.");
  if (Boolean(s.doneAt) === done) return;
  await db.update(subtask).set({ doneAt: done ? new Date() : null, status: done ? "done" : "todo" }).where(eq(subtask.id, id));
  if (done) await recordContribution({ teamId: t.teamId!, memberId: s.ownerId ?? m.id, kind: "subtask_done", what: `${s.title} (${t.title})`, taskId: t.id, subtaskId: s.id });
  if (t.status === "todo" && done) await db.update(task).set({ status: "doing" }).where(eq(task.id, t.id));
  refresh(t.teamId!, s.taskId);
}

export async function deleteSubtask(id: string) {
  const me = await requireUser();
  const [s] = await db.select().from(subtask).where(eq(subtask.id, id));
  if (!s) return;
  const { t, me: m } = await teamTask(me.id, s.taskId);
  if (!can(m, "tasks")) throw new Error("You don't have permission to delete subtasks.");
  await db.delete(subtask).where(eq(subtask.id, id));
  refresh(t.teamId!, s.taskId);
}

// ---------- comments ----------

export async function addComment(taskId: string, body: string) {
  const me = await requireUser();
  const { t, me: m } = await teamTask(me.id, taskId);
  if (!canComment(m)) throw new Error("Guests can read comments but not write them.");
  const b = clean(body, 2000);
  if (!b) throw new Error("Write something first.");
  const recent = await db.select({ id: taskComment.id }).from(taskComment).where(eq(taskComment.taskId, taskId)).orderBy(asc(taskComment.createdAt));
  if (recent.length >= 500) throw new Error("This task has reached 500 comments.");
  await db.insert(taskComment).values({ taskId, memberId: m.id, body: b });
  refresh(t.teamId!, taskId);
}

export async function deleteComment(id: string) {
  const me = await requireUser();
  const [c] = await db.select().from(taskComment).where(eq(taskComment.id, id));
  if (!c) return;
  const { t, me: m } = await teamTask(me.id, c.taskId);
  if (c.memberId !== m.id && !m.isAdmin) throw new Error("You can only delete your own comments.");
  await db.delete(taskComment).where(eq(taskComment.id, id));
  refresh(t.teamId!, c.taskId);
}

// ---------- access levels ----------

/** Leader only. Advisers see everything and comment; guests see tasks and The Comb. Neither holds powers or roles. */
export async function setMemberAccess(memberId: string, access: "member" | "adviser" | "guest") {
  const me = await requireUser();
  if (!["member", "adviser", "guest"].includes(access)) throw new Error("Unknown access level.");
  const [m] = await db.select().from(teamMember).where(eq(teamMember.id, memberId));
  if (!m) throw new Error("That person is no longer in the team.");
  await requireAdmin(me.id, m.teamId);
  if (m.isAdmin) throw new Error("The Leader is always a full member.");
  // their existing task parts and logs stay; they just can't be given new ones
  await db.update(teamMember).set(access === "member" ? { access } : { access, roleId: null, perms: [] }).where(eq(teamMember.id, memberId));
  refresh(m.teamId);
}
