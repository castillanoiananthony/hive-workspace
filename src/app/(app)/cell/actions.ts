"use server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { checklistItem, goal, task, taskLink } from "@/db/schema";
import { periodFor, zonedToUtc } from "@/lib/dates";
import { wouldCycle } from "@/lib/progress";
import { parseQuickAdd } from "@/lib/quickadd";
import { requireUser } from "@/lib/session";

type Level = "year" | "month" | "week";
const RANK: Record<Level, number> = { year: 0, month: 1, week: 2 };
const text = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

async function ownGoal(userId: string, id: string | null | undefined) {
  if (!id) return null;
  const [row] = await db.select().from(goal).where(and(eq(goal.id, id), eq(goal.ownerId, userId)));
  if (!row) throw new Error("That goal no longer exists.");
  return row;
}

async function ownTask(userId: string, id: string) {
  // shortcut: personal tasks only; Phase 4 lets team owners edit their team's tasks here too
  const [row] = await db.select().from(task).where(and(eq(task.id, id), eq(task.ownerId, userId), isNull(task.teamId)));
  if (!row) throw new Error("That task no longer exists.");
  return row;
}

const touchGoal = (id: string | null) => (id ? db.update(goal).set({ lastActivityAt: new Date() }).where(eq(goal.id, id)) : null);

// ---------- goals ----------

export async function createGoal(input: { title: string; level: Level; parentId: string | null }) {
  const me = await requireUser();
  const title = text(input.title);
  if (!title) throw new Error("Give your goal a name.");
  if (!(input.level in RANK)) throw new Error("Pick year, month or week.");
  const parent = await ownGoal(me.id, input.parentId);
  if (parent && RANK[parent.level] >= RANK[input.level]) throw new Error("A goal can only sit under a bigger goal (year → month → week).");
  await db.insert(goal).values({ ownerId: me.id, title, level: input.level, parentId: parent?.id ?? null, period: periodFor(input.level, new Date(), me.timezone) });
  await touchGoal(parent?.id ?? null);
  revalidatePath("/cell");
}

export async function updateGoal(id: string, patch: { title?: string; parentId?: string | null; manualProgress?: number; done?: boolean }) {
  const me = await requireUser();
  const current = (await ownGoal(me.id, id))!;
  const set: Partial<typeof goal.$inferInsert> = { lastActivityAt: new Date() };
  if (patch.title !== undefined) {
    set.title = text(patch.title);
    if (!set.title) throw new Error("A goal needs a name.");
  }
  if (patch.parentId !== undefined) {
    const parent = await ownGoal(me.id, patch.parentId);
    if (parent && RANK[parent.level] >= RANK[current.level]) throw new Error("A goal can only sit under a bigger goal (year → month → week).");
    const all = await db.select({ id: goal.id, parentId: goal.parentId }).from(goal).where(eq(goal.ownerId, me.id));
    if (wouldCycle(all, id, parent?.id ?? null)) throw new Error("A goal can't sit under one of its own smaller goals.");
    set.parentId = parent?.id ?? null;
  }
  if (patch.manualProgress !== undefined) set.manualProgress = Math.max(0, Math.min(100, Math.round(patch.manualProgress)));
  if (patch.done !== undefined) set.done = Boolean(patch.done);
  await db.update(goal).set(set).where(eq(goal.id, id));
  revalidatePath("/cell");
}

/** Archive hides a goal without losing it; `restore` brings it back (the Undo button). */
export async function archiveGoal(id: string, restore = false) {
  const me = await requireUser();
  await ownGoal(me.id, id);
  await db.update(goal).set({ archivedAt: restore ? null : new Date() }).where(eq(goal.id, id));
  revalidatePath("/cell");
}

// ---------- tasks ----------

export async function quickAddTask(input: string, goalId: string | null = null) {
  const me = await requireUser();
  const parsed = parseQuickAdd(text(input, 300), me.timezone);
  if (!parsed.title) throw new Error("Type what you need to do.");
  const parent = await ownGoal(me.id, goalId);
  const [row] = await db.insert(task).values({ ownerId: me.id, title: parsed.title.slice(0, 200), dueAt: parsed.dueAt, hasTime: parsed.hasTime, goalId: parent?.id ?? null }).returning({ id: task.id });
  await touchGoal(parent?.id ?? null);
  revalidatePath("/cell");
  return { id: row.id, title: parsed.title, dueAt: parsed.dueAt?.toISOString() ?? null, hasTime: parsed.hasTime };
}

export async function newTask(goalId: string | null = null) {
  const me = await requireUser();
  const parent = await ownGoal(me.id, goalId);
  const [row] = await db.insert(task).values({ ownerId: me.id, goalId: parent?.id ?? null }).returning({ id: task.id });
  redirect(`/tasks/${row.id}`);
}

export async function setTaskStatus(id: string, status: "todo" | "doing" | "done") {
  const me = await requireUser();
  const t = await ownTask(me.id, id);
  if (!["todo", "doing", "done"].includes(status)) throw new Error("Unknown status.");
  await db.update(task).set({ status }).where(eq(task.id, id));
  await touchGoal(t.goalId);
  revalidatePath("/cell");
}

export type TaskDoc = {
  title: string;
  notes: unknown;
  status: "todo" | "doing" | "done";
  dueDate: string | null; // "2027-03-05" in the user's zone
  dueTime: string | null; // "17:00" or null for all-day
  goalId: string | null;
  checklist: { text: string; done: boolean }[];
  links: { title: string; url: string }[];
};

const safeUrl = (u: string) => {
  try {
    const url = new URL(u.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

/** Autosave target for the task page: replaces the whole document in one transaction. */
export async function saveTask(id: string, doc: TaskDoc) {
  const me = await requireUser();
  const before = await ownTask(me.id, id);
  const parent = await ownGoal(me.id, doc.goalId);
  const dueAt = doc.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(doc.dueDate) ? zonedToUtc(doc.dueDate, doc.dueTime && /^\d{2}:\d{2}$/.test(doc.dueTime) ? doc.dueTime : null, me.timezone) : null;
  const checklist = doc.checklist.slice(0, 100).map((c, i) => ({ taskId: id, text: text(c.text, 300), done: Boolean(c.done), position: i })).filter((c) => c.text);
  const links = doc.links.slice(0, 50).flatMap((l, i) => {
    const url = safeUrl(l.url);
    return url ? [{ taskId: id, title: text(l.title, 200) || url, url, position: i }] : [];
  });
  await db.transaction(async (tx) => {
    await tx.update(task).set({
      title: text(doc.title), notes: doc.notes ?? null, status: ["todo", "doing", "done"].includes(doc.status) ? doc.status : "todo",
      dueAt, hasTime: Boolean(dueAt && doc.dueTime), goalId: parent?.id ?? null,
    }).where(eq(task.id, id));
    await tx.delete(checklistItem).where(eq(checklistItem.taskId, id));
    if (checklist.length) await tx.insert(checklistItem).values(checklist);
    await tx.delete(taskLink).where(eq(taskLink.taskId, id));
    if (links.length) await tx.insert(taskLink).values(links);
  });
  const touched = [...new Set([before.goalId, parent?.id ?? null].filter(Boolean))] as string[];
  if (touched.length) await db.update(goal).set({ lastActivityAt: new Date() }).where(inArray(goal.id, touched));
  revalidatePath("/cell");
  return { savedAt: new Date().toISOString(), droppedLinks: doc.links.filter((l) => l.url.trim()).length - links.length };
}

export async function deleteTask(id: string) {
  const me = await requireUser();
  const t = await ownTask(me.id, id);
  const [items, links] = await Promise.all([
    db.select().from(checklistItem).where(eq(checklistItem.taskId, id)),
    db.select().from(taskLink).where(eq(taskLink.taskId, id)),
  ]);
  await db.delete(task).where(eq(task.id, id));
  await touchGoal(t.goalId);
  revalidatePath("/cell");
  // handed back to the page so "Undo" can put everything back
  return { task: t, items, links };
}

export async function restoreTask(snapshot: Awaited<ReturnType<typeof deleteTask>>) {
  const me = await requireUser();
  // the snapshot comes back from the browser, so only trusted fields are re-inserted and ownership is forced
  const t = snapshot.task;
  const parent = t.goalId ? await ownGoal(me.id, t.goalId).catch(() => null) : null;
  const status = ["todo", "doing", "done"].includes(t.status) ? t.status : "todo";
  await db.transaction(async (tx) => {
    await tx.insert(task).values({
      id: String(t.id), ownerId: me.id, title: text(t.title), notes: t.notes ?? null, status,
      dueAt: t.dueAt ? new Date(t.dueAt) : null, hasTime: Boolean(t.hasTime), goalId: parent?.id ?? null,
    });
    const items = snapshot.items.slice(0, 100).map((c, i) => ({ taskId: String(t.id), text: text(c.text, 300), done: Boolean(c.done), position: i })).filter((c) => c.text);
    if (items.length) await tx.insert(checklistItem).values(items);
    const links = snapshot.links.slice(0, 50).flatMap((l, i) => { const url = safeUrl(l.url); return url ? [{ taskId: String(t.id), title: text(l.title), url, position: i }] : []; });
    if (links.length) await tx.insert(taskLink).values(links);
  });
  revalidatePath("/cell");
}
