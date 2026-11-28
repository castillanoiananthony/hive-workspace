"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { classSlot, focus, goal, semester, subject, task } from "@/db/schema";
import { utcToZoned } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { SUBJECT_COLORS, splitTerms, type Period } from "@/lib/student";

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);
const refresh = () => { revalidatePath("/cell"); revalidatePath("/cell/tasks"); revalidatePath("/calendar"); revalidatePath("/home"); };

// ---------- subjects ----------

export async function addSubject(code: string, color?: string) {
  const me = await requireUser();
  const c = clean(code, 24);
  if (!c) throw new Error("Type the subject code, e.g. ASE 111.");
  const mine = await db.select({ id: subject.id, code: subject.code }).from(subject).where(eq(subject.ownerId, me.id));
  if (mine.length >= 20) throw new Error("You can have up to 20 subjects.");
  if (mine.some((s) => s.code.toLowerCase() === c.toLowerCase())) throw new Error(`You already have ${c}.`);
  const col = SUBJECT_COLORS.includes(color as (typeof SUBJECT_COLORS)[number]) ? color! : SUBJECT_COLORS[mine.length % SUBJECT_COLORS.length];
  await db.insert(subject).values({ ownerId: me.id, code: c, color: col, position: mine.length });
  refresh();
}

export async function updateSubject(id: string, patch: { code?: string; color?: string }) {
  const me = await requireUser();
  const set: Partial<typeof subject.$inferInsert> = {};
  if (patch.code !== undefined) { set.code = clean(patch.code, 24); if (!set.code) throw new Error("A subject needs a code."); }
  if (patch.color !== undefined && SUBJECT_COLORS.includes(patch.color as (typeof SUBJECT_COLORS)[number])) set.color = patch.color;
  await db.update(subject).set(set).where(and(eq(subject.id, id), eq(subject.ownerId, me.id)));
  refresh();
}

/** Deleting a subject untags its tasks (they stay) and removes its class schedule slots. */
export async function deleteSubject(id: string) {
  const me = await requireUser();
  await db.delete(subject).where(and(eq(subject.id, id), eq(subject.ownerId, me.id)));
  refresh();
}

// ---------- semesters ----------

/** Saves a semester. With makeGoals, also adds a goal for the sem and one for each term under it, so goals break down by term. */
export async function createSemester(input: { name: string; start: string; end: string; periods?: Period[]; makeGoals?: boolean }) {
  const me = await requireUser();
  const name = clean(input.name, 80), start = clean(input.start, 10), end = clean(input.end, 10);
  if (!name || !isDay(start) || !isDay(end) || end <= start) throw new Error("Give the semester a name, a start date and a later end date.");
  const periods = (input.periods?.length ? input.periods : splitTerms(start, end))
    .map((p) => ({ name: clean(p.name, 40), start: clean(p.start, 10), end: clean(p.end, 10) }))
    .filter((p) => p.name && isDay(p.start) && isDay(p.end) && p.start <= p.end).slice(0, 6);
  if (!periods.length) throw new Error("Add at least one term with a start and end date.");
  await db.insert(semester).values({ ownerId: me.id, name, start, end, periods });
  if (input.makeGoals) {
    const [y] = await db.insert(goal).values({ ownerId: me.id, title: name, level: "year", period: start.slice(0, 4) }).returning({ id: goal.id });
    const pretty = (d: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
    await db.insert(goal).values(periods.map((p) => ({ ownerId: me.id, parentId: y.id, title: `${p.name} (${pretty(p.start)} – ${pretty(p.end)})`, level: "month" as const, period: p.start.slice(0, 7) })));
  }
  refresh();
}

export async function deleteSemester(id: string) {
  const me = await requireUser();
  await db.delete(semester).where(and(eq(semester.id, id), eq(semester.ownerId, me.id))); // goals made from it stay
  refresh();
}

// ---------- weekly class schedule ----------

export async function addClassSlot(input: { subjectId?: string; title?: string; weekdays: number[]; start: string; end: string; room?: string }) {
  const me = await requireUser();
  const start = clean(input.start, 5), end = clean(input.end, 5);
  if (!isTime(start) || !isTime(end) || end <= start) throw new Error("Pick a start time and a later end time.");
  const days = [...new Set((input.weekdays ?? []).map(Number).filter((d) => d >= 0 && d <= 6))];
  if (!days.length) throw new Error("Pick at least one day.");
  let title = clean(input.title, 60), subjectId: string | null = null;
  if (input.subjectId) {
    const [s] = await db.select().from(subject).where(and(eq(subject.id, input.subjectId), eq(subject.ownerId, me.id)));
    if (!s) throw new Error("That subject no longer exists.");
    subjectId = s.id; title ||= s.code;
  }
  if (!title) throw new Error("Pick a subject or type a class name.");
  const count = await db.select({ id: classSlot.id }).from(classSlot).where(eq(classSlot.ownerId, me.id));
  if (count.length + days.length > 60) throw new Error("Your schedule is full (60 class meetings a week).");
  await db.insert(classSlot).values(days.map((weekday) => ({ ownerId: me.id, subjectId, title, weekday, start, end, room: clean(input.room, 40) || null })));
  refresh();
}

export async function deleteClassSlot(id: string) {
  const me = await requireUser();
  await db.delete(classSlot).where(and(eq(classSlot.id, id), eq(classSlot.ownerId, me.id)));
  refresh();
}

// ---------- Today's 3 ----------

/** Sets today's (in your time zone) focus list: up to three of your own open tasks. */
export async function setTodaysThree(taskIds: string[]) {
  const me = await requireUser();
  const ids = [...new Set((Array.isArray(taskIds) ? taskIds : []).map(String))].slice(0, 3);
  const ok = ids.length ? await db.select({ id: task.id }).from(task).where(and(inArray(task.id, ids), eq(task.ownerId, me.id))) : [];
  const keep = ids.filter((id) => ok.some((o) => o.id === id));
  const date = utcToZoned(new Date(), me.timezone).date;
  await db.insert(focus).values({ userId: me.id, date, taskIds: keep }).onConflictDoUpdate({ target: [focus.userId, focus.date], set: { taskIds: keep } });
  refresh();
}
