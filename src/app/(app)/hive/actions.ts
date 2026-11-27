"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { assignment, checklistItem, task, taskLink, team, teamMember, template } from "@/db/schema";
import { parseRoster } from "@/lib/roster";
import { requireUser } from "@/lib/session";
import { ownTeam, TEAM_COLORS } from "@/lib/teams";
import { newToken } from "@/lib/tokens";
import { createTeamTask } from "@/lib/team-tasks";

const text = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);
const color = (c: unknown) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : TEAM_COLORS[0]);
const refresh = (teamId?: string) => { revalidatePath("/hive"); if (teamId) revalidatePath(`/hive/${teamId}`); };

// ---------- teams ----------

export async function createTeam(input: { name: string; color: string }) {
  const me = await requireUser();
  const name = text(input.name, 80);
  if (!name) throw new Error("Give your team a name.");
  const [row] = await db.insert(team).values({ ownerId: me.id, name, color: color(input.color) }).returning({ id: team.id });
  refresh();
  redirect(`/hive/${row.id}`);
}

export async function updateTeam(teamId: string, patch: { name?: string; color?: string; digestEnabled?: boolean; digestDay?: number }) {
  const me = await requireUser();
  await ownTeam(me.id, teamId);
  const set: Partial<typeof team.$inferInsert> = {};
  if (patch.name !== undefined) { set.name = text(patch.name, 80); if (!set.name) throw new Error("A team needs a name."); }
  if (patch.color !== undefined) set.color = color(patch.color);
  if (patch.digestEnabled !== undefined) set.digestEnabled = Boolean(patch.digestEnabled);
  if (patch.digestDay !== undefined) set.digestDay = Math.max(0, Math.min(6, Math.round(patch.digestDay)));
  await db.update(team).set(set).where(eq(team.id, teamId));
  refresh(teamId);
}

/** Deletes the team with its tasks, roster and templates. The page asks the user to type the team name first. */
export async function deleteTeam(teamId: string, confirmName: string) {
  const me = await requireUser();
  const t = await ownTeam(me.id, teamId);
  if (confirmName.trim() !== t.name) throw new Error("Type the team name exactly to delete it.");
  await db.delete(team).where(eq(team.id, teamId));
  refresh();
  redirect("/hive");
}

// ---------- roster ----------

export async function addMembers(teamId: string, input: string) {
  const me = await requireUser();
  await ownTeam(me.id, teamId);
  const existing = await db.select({ email: teamMember.email }).from(teamMember).where(eq(teamMember.teamId, teamId));
  if (existing.length >= 200) throw new Error("A team can have up to 200 members.");
  const parsed = parseRoster(input.slice(0, 20000), existing.map((e) => e.email));
  const room = 200 - existing.length;
  const adding = parsed.valid.slice(0, room);
  // the unsubscribe link is minted when the first Buzz email goes out; this placeholder just fills the unique column
  if (adding.length) await db.insert(teamMember).values(adding.map((m) => ({ teamId, name: m.name, email: m.email, unsubscribeTokenHash: newToken().hash })));
  refresh(teamId);
  return { added: adding.map((m) => m.email), invalid: parsed.invalid, duplicates: parsed.duplicates, overLimit: parsed.valid.length - adding.length };
}

export async function renameMember(memberId: string, name: string) {
  const me = await requireUser();
  const [m] = await db.select().from(teamMember).where(eq(teamMember.id, memberId));
  await ownTeam(me.id, m?.teamId);
  const n = text(name, 80);
  if (!n) throw new Error("A name can't be empty.");
  await db.update(teamMember).set({ name: n }).where(eq(teamMember.id, memberId));
  refresh(m.teamId);
}

export async function removeMember(memberId: string) {
  const me = await requireUser();
  const [m] = await db.select().from(teamMember).where(eq(teamMember.id, memberId));
  await ownTeam(me.id, m?.teamId);
  await db.delete(teamMember).where(eq(teamMember.id, memberId)); // their assignments go with them
  refresh(m.teamId);
}

// ---------- team tasks and templates ----------

/** A blank team task, or one filled from a template ("Use template" is the second click). */
export async function newTeamTask(teamId: string, templateId?: string) {
  const me = await requireUser();
  await ownTeam(me.id, teamId);
  const tpl = templateId ? (await db.select().from(template).where(and(eq(template.id, templateId), eq(template.teamId, teamId))))[0] : undefined;
  const id = await createTeamTask(me.id, teamId, tpl ?? null, null);
  redirect(`/tasks/${id}`);
}

export async function saveAsTemplate(taskId: string) {
  const me = await requireUser();
  const [t] = await db.select().from(task).where(eq(task.id, taskId));
  await ownTeam(me.id, t?.teamId);
  const [items, links, assigned, members] = await Promise.all([
    db.select({ text: checklistItem.text }).from(checklistItem).where(eq(checklistItem.taskId, taskId)).orderBy(checklistItem.position),
    db.select({ title: taskLink.title, url: taskLink.url }).from(taskLink).where(eq(taskLink.taskId, taskId)).orderBy(taskLink.position),
    db.select({ memberId: assignment.memberId }).from(assignment).where(eq(assignment.taskId, taskId)),
    db.select({ id: teamMember.id }).from(teamMember).where(eq(teamMember.teamId, t.teamId!)),
  ]);
  const ids = assigned.map((a) => a.memberId);
  await db.insert(template).values({
    teamId: t.teamId!, title: t.title || "Untitled template", howTo: t.howTo,
    content: { checklist: items.map((i) => i.text), links },
    assignAll: members.length > 0 && ids.length === members.length, memberIds: ids,
  });
  refresh(t.teamId!);
}

export async function updateTemplate(id: string, patch: { title?: string; recurrence?: "none" | "weekly" | "monthly"; weekday?: number | null; monthDay?: number | null; dueTime?: string | null; assignAll?: boolean; memberIds?: string[] }) {
  const me = await requireUser();
  const [tpl] = await db.select().from(template).where(eq(template.id, id));
  await ownTeam(me.id, tpl?.teamId);
  const set: Partial<typeof template.$inferInsert> = {};
  if (patch.title !== undefined) { set.title = text(patch.title); if (!set.title) throw new Error("A template needs a name."); }
  if (patch.recurrence !== undefined) {
    if (!["none", "weekly", "monthly"].includes(patch.recurrence)) throw new Error("Pick how often it repeats.");
    set.recurrence = patch.recurrence;
    set.weekday = patch.recurrence === "weekly" ? Math.max(0, Math.min(6, Number(patch.weekday ?? 5))) : null;
    set.monthDay = patch.recurrence === "monthly" ? Math.max(1, Math.min(28, Number(patch.monthDay ?? 1))) : null;
    set.lastRunPeriod = null; // a changed schedule starts fresh
  }
  if (patch.dueTime !== undefined) set.dueTime = patch.dueTime && /^\d{2}:\d{2}$/.test(patch.dueTime) ? patch.dueTime : null;
  if (patch.assignAll !== undefined) set.assignAll = Boolean(patch.assignAll);
  if (patch.memberIds !== undefined) {
    const valid = patch.memberIds.length ? await db.select({ id: teamMember.id }).from(teamMember).where(and(eq(teamMember.teamId, tpl.teamId), inArray(teamMember.id, patch.memberIds))) : [];
    set.memberIds = valid.map((v) => v.id);
  }
  await db.update(template).set(set).where(eq(template.id, id));
  refresh(tpl.teamId);
}

export async function deleteTemplate(id: string) {
  const me = await requireUser();
  const [tpl] = await db.select().from(template).where(eq(template.id, id));
  await ownTeam(me.id, tpl?.teamId);
  await db.delete(template).where(eq(template.id, id));
  refresh(tpl.teamId);
}
