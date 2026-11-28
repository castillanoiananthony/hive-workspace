"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { hiveMilestone, team, teamChecklist, teamChecklistItem, teamMember } from "@/db/schema";
import { zonedToUtc } from "@/lib/dates";
import { can } from "@/lib/hive-perms";
import { PITCH_ITEMS, SUBMISSION_ITEMS } from "@/lib/hive-templates";
import { requireUser } from "@/lib/session";
import { requireAdmin, requirePerm, teamAccess } from "@/lib/teams";

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
const refresh = (teamId: string) => { revalidatePath(`/hive/${teamId}`); revalidatePath(`/hive/${teamId}/summary`); revalidatePath("/hive"); };
const when = (date: unknown, time: unknown, tz: string) => {
  const d = clean(date, 10), t = clean(time, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { dueAt: null, hasTime: false };
  const hasTime = /^\d{2}:\d{2}$/.test(t);
  return { dueAt: zonedToUtc(d, hasTime ? t : null, tz), hasTime };
};

// ---------- milestones ----------

export async function addHiveMilestone(teamId: string, input: { title: string; date?: string; time?: string }) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "tasks");
  const title = clean(input.title, 120);
  if (!title) throw new Error("Give the milestone a name.");
  const n = await db.select({ id: hiveMilestone.id }).from(hiveMilestone).where(eq(hiveMilestone.teamId, teamId));
  if (n.length >= 40) throw new Error("A hive can have up to 40 milestones.");
  await db.insert(hiveMilestone).values({ teamId, title, ...when(input.date, input.time, me.timezone), position: n.length });
  refresh(teamId);
}

async function milestoneFor(userId: string, id: string) {
  const [m] = await db.select().from(hiveMilestone).where(eq(hiveMilestone.id, id));
  if (!m) throw new Error("That milestone no longer exists.");
  await requirePerm(userId, m.teamId, "tasks");
  return m;
}

export async function updateHiveMilestone(id: string, input: { title?: string; date?: string; time?: string; done?: boolean }) {
  const me = await requireUser();
  const m = await milestoneFor(me.id, id);
  const set: Partial<typeof hiveMilestone.$inferInsert> = {};
  if (input.title !== undefined) { set.title = clean(input.title, 120); if (!set.title) throw new Error("A milestone needs a name."); }
  if (input.date !== undefined) Object.assign(set, when(input.date, input.time, me.timezone));
  if (input.done !== undefined) set.doneAt = input.done ? m.doneAt ?? new Date() : null;
  await db.update(hiveMilestone).set(set).where(eq(hiveMilestone.id, id));
  refresh(m.teamId);
}

export async function deleteHiveMilestone(id: string) {
  const me = await requireUser();
  const m = await milestoneFor(me.id, id);
  await db.delete(hiveMilestone).where(eq(hiveMilestone.id, id));
  refresh(m.teamId);
}

// ---------- checklists ----------

export async function addTeamChecklist(teamId: string, input: { title?: string; preset?: "submission" | "pitch" }) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "tasks");
  const items = input.preset === "pitch" ? PITCH_ITEMS : input.preset === "submission" ? SUBMISSION_ITEMS : [];
  const title = clean(input.title, 80) || (input.preset === "pitch" ? "Pitch / demo prep" : input.preset === "submission" ? "Submission" : "Checklist");
  const n = await db.select({ id: teamChecklist.id }).from(teamChecklist).where(eq(teamChecklist.teamId, teamId));
  if (n.length >= 15) throw new Error("A hive can have up to 15 checklists.");
  const [c] = await db.insert(teamChecklist).values({ teamId, title, position: n.length }).returning({ id: teamChecklist.id });
  if (items.length) await db.insert(teamChecklistItem).values(items.map((text, i) => ({ checklistId: c.id, text, position: i })));
  refresh(teamId);
}

export async function deleteTeamChecklist(id: string) {
  const me = await requireUser();
  const [c] = await db.select().from(teamChecklist).where(eq(teamChecklist.id, id));
  if (!c) return;
  await requirePerm(me.id, c.teamId, "tasks");
  await db.delete(teamChecklist).where(eq(teamChecklist.id, id));
  refresh(c.teamId);
}

async function ownerIn(teamId: string, ownerId: unknown) {
  const id = clean(ownerId, 64);
  if (!id) return null;
  const [o] = await db.select({ id: teamMember.id }).from(teamMember).where(and(eq(teamMember.id, id), eq(teamMember.teamId, teamId), eq(teamMember.access, "member")));
  if (!o) throw new Error("That person can't own items in this hive.");
  return o.id;
}

export async function addChecklistItem(checklistId: string, input: { text: string; ownerId?: string }) {
  const me = await requireUser();
  const [c] = await db.select().from(teamChecklist).where(eq(teamChecklist.id, checklistId));
  if (!c) throw new Error("That checklist no longer exists.");
  await requirePerm(me.id, c.teamId, "tasks");
  const text = clean(input.text, 200);
  if (!text) throw new Error("Type the item first.");
  const n = await db.select({ id: teamChecklistItem.id }).from(teamChecklistItem).where(eq(teamChecklistItem.checklistId, checklistId));
  if (n.length >= 50) throw new Error("A checklist can have up to 50 items.");
  await db.insert(teamChecklistItem).values({ checklistId, text, ownerId: await ownerIn(c.teamId, input.ownerId), position: n.length });
  refresh(c.teamId);
}

async function itemFor(userId: string, id: string) {
  const [r] = await db.select({ i: teamChecklistItem, teamId: teamChecklist.teamId }).from(teamChecklistItem).innerJoin(teamChecklist, eq(teamChecklistItem.checklistId, teamChecklist.id)).where(eq(teamChecklistItem.id, id));
  if (!r) throw new Error("That item no longer exists.");
  return r;
}

export async function updateChecklistItem(id: string, input: { text?: string; ownerId?: string }) {
  const me = await requireUser();
  const r = await itemFor(me.id, id);
  await requirePerm(me.id, r.teamId, "tasks");
  const set: Partial<typeof teamChecklistItem.$inferInsert> = {};
  if (input.text !== undefined) { set.text = clean(input.text, 200); if (!set.text) throw new Error("An item needs some text."); }
  if (input.ownerId !== undefined) set.ownerId = await ownerIn(r.teamId, input.ownerId);
  await db.update(teamChecklistItem).set(set).where(eq(teamChecklistItem.id, id));
  refresh(r.teamId);
}

/** The item's owner (or anyone who can manage tasks) ticks it. Who ticked it is kept. */
export async function tickChecklistItem(id: string, done: boolean) {
  const me = await requireUser();
  const r = await itemFor(me.id, id);
  const { me: m, team: t } = await teamAccess(me.id, r.teamId);
  if (t.archivedAt) throw new Error("This hive is archived.");
  if (r.i.ownerId !== m.id && !can(m, "tasks")) throw new Error("Only the item's owner can tick it.");
  await db.update(teamChecklistItem).set({ doneAt: done ? new Date() : null, doneById: done ? m.id : null }).where(eq(teamChecklistItem.id, id));
  refresh(r.teamId);
}

export async function deleteChecklistItem(id: string) {
  const me = await requireUser();
  const r = await itemFor(me.id, id);
  await requirePerm(me.id, r.teamId, "tasks");
  await db.delete(teamChecklistItem).where(eq(teamChecklistItem.id, id));
  refresh(r.teamId);
}

// ---------- archive ----------

/** Leader only. An archived hive is read-only and moves to the Archived list; it can be brought back. */
export async function setArchived(teamId: string, archived: boolean) {
  const me = await requireUser();
  await requireAdmin(me.id, teamId);
  await db.update(team).set({ archivedAt: archived ? new Date() : null }).where(eq(team.id, teamId));
  refresh(teamId);
}
