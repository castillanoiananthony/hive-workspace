"use server";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { assignment, checklistItem, combPost, progressLog, task, taskLink, team, teamLink, teamMember, teamRole, template } from "@/db/schema";
import { sendInvites, sendPendingAssignments } from "@/lib/buzz";
import { ALL_PERMS, DEFAULT_PERMS, type Perm } from "@/lib/hive-perms";
import { cleanImportanceColors } from "@/lib/importance";
import { parseRoster } from "@/lib/roster";
import { requireUser } from "@/lib/session";
import { createTeamTask } from "@/lib/team-tasks";
import { createTeamWithAdmin, requireAdmin, requirePerm, teamAccess, TEAM_COLORS } from "@/lib/teams";
import { newToken } from "@/lib/tokens";

const text = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);
const color = (c: unknown) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : TEAM_COLORS[0]);
const cleanPerms = (p: unknown): Perm[] => (Array.isArray(p) ? ALL_PERMS.filter((k) => p.includes(k)) : []);
const refresh = (teamId?: string) => { revalidatePath("/hive"); if (teamId) revalidatePath(`/hive/${teamId}`); };

async function memberOf(memberId: string) {
  const [m] = await db.select().from(teamMember).where(eq(teamMember.id, memberId));
  if (!m) throw new Error("That person is no longer in the team.");
  return m;
}

async function starterPlacement(teamId: string) {
  // new people are plain members (no role) until the Leader gives them one
  const [admin] = await db.select({ id: teamMember.id }).from(teamMember).where(and(eq(teamMember.teamId, teamId), eq(teamMember.isAdmin, true)));
  return { roleId: null, perms: DEFAULT_PERMS, parentId: admin?.id ?? null };
}

// ---------- teams ----------

export async function createTeam(input: { name: string; color: string; roles?: string[] }) {
  const me = await requireUser();
  const name = text(input.name, 80);
  if (!name) throw new Error("Give your team a name.");
  const id = await createTeamWithAdmin(me, name, color(input.color), Array.isArray(input.roles) ? input.roles.map(String) : undefined);
  refresh();
  redirect(`/hive/${id}`);
}

export async function updateTeam(teamId: string, patch: { name?: string; color?: string; digestEnabled?: boolean; digestDay?: number; importanceColors?: Record<string, string> }) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "settings");
  const set: Partial<typeof team.$inferInsert> = {};
  if (patch.name !== undefined) { set.name = text(patch.name, 80); if (!set.name) throw new Error("A team needs a name."); }
  if (patch.color !== undefined) set.color = color(patch.color);
  if (patch.digestEnabled !== undefined) set.digestEnabled = Boolean(patch.digestEnabled);
  if (patch.importanceColors !== undefined) set.importanceColors = cleanImportanceColors(patch.importanceColors);
  if (patch.digestDay !== undefined) set.digestDay = Math.max(0, Math.min(6, Math.round(patch.digestDay)));
  await db.update(team).set(set).where(eq(team.id, teamId));
  refresh(teamId);
}

/** Deletes the team with its tasks, roster and templates. Only the admin, after typing the team name. */
export async function deleteTeam(teamId: string, confirmName: string) {
  const me = await requireUser();
  const { team: t } = await requireAdmin(me.id, teamId);
  if (confirmName.trim() !== t.name) throw new Error("Type the team name exactly to delete it.");
  await db.delete(team).where(eq(team.id, teamId));
  refresh();
  redirect("/hive");
}

// ---------- members, invites, join link ----------

export async function addMembers(teamId: string, input: string) {
  const me = await requireUser();
  const { me: inviter } = await requirePerm(me.id, teamId, "members");
  const existing = await db.select({ email: teamMember.email }).from(teamMember).where(eq(teamMember.teamId, teamId));
  if (existing.length >= 200) throw new Error("A team can have up to 200 members.");
  const parsed = parseRoster(input.slice(0, 20000), existing.map((e) => e.email));
  const adding = parsed.valid.slice(0, 200 - existing.length);
  const start = await starterPlacement(teamId);
  // people who already have an account join straight away; everyone else is invited by email
  const accounts = adding.length
    ? (await db.execute<{ id: string; email: string }>(sql`select id, lower(email) as email from "user" where lower(email) in (${sql.join(adding.map((a) => sql`${a.email}`), sql`, `)})`)).rows
    : [];
  const rows = adding.length
    ? await db.insert(teamMember).values(adding.map((m) => {
        const acct = accounts.find((r) => r.email === m.email);
        return { teamId, name: m.name, email: m.email, unsubscribeTokenHash: newToken().hash, ...start, userId: acct?.id ?? null, joinedAt: acct ? new Date() : null };
      })).returning({ id: teamMember.id })
    : [];
  if (rows.length) await sendInvites(rows.map((r) => r.id), inviter.nickname || inviter.name);
  refresh(teamId);
  return { added: adding.map((m) => m.email), invalid: parsed.invalid, duplicates: parsed.duplicates, overLimit: parsed.valid.length - adding.length };
}

export async function renameMember(memberId: string, name: string) {
  const me = await requireUser();
  const m = await memberOf(memberId);
  await requirePerm(me.id, m.teamId, "members");
  const n = text(name, 80);
  if (!n) throw new Error("A name can't be empty.");
  await db.update(teamMember).set({ name: n }).where(eq(teamMember.id, memberId));
  refresh(m.teamId);
}

/** Nicknames: anyone may set their own; changing someone else's needs the "Edit nicknames" power. */
export async function setNickname(memberId: string, nickname: string) {
  const me = await requireUser();
  const m = await memberOf(memberId);
  if (m.userId === me.id) await teamAccess(me.id, m.teamId);
  else await requirePerm(me.id, m.teamId, "nicknames");
  await db.update(teamMember).set({ nickname: text(nickname, 40) || null }).where(eq(teamMember.id, memberId));
  refresh(m.teamId);
}

export async function removeMember(memberId: string) {
  const me = await requireUser();
  const m = await memberOf(memberId);
  await requirePerm(me.id, m.teamId, "members");
  if (m.isAdmin) throw new Error("The admin can't be removed. Delete the team instead.");
  // people under them move up to their leader instead of floating loose
  await db.update(teamMember).set({ parentId: m.parentId }).where(eq(teamMember.parentId, memberId));
  await db.delete(teamMember).where(eq(teamMember.id, memberId));
  refresh(m.teamId);
}

export async function setJoinLink(teamId: string, mode: "on" | "off" | "new") {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "members");
  await db.update(team).set({ joinCode: mode === "off" ? null : randomBytes(12).toString("base64url") }).where(eq(team.id, teamId));
  refresh(teamId);
}

/** Someone with an account follows a team's join link. */
export async function joinTeam(code: string) {
  const me = await requireUser();
  const [t] = await db.select().from(team).where(eq(team.joinCode, code));
  if (!t) throw new Error("This join link doesn't work any more. Ask the team for a new one.");
  const start = await starterPlacement(t.id);
  await db.insert(teamMember).values({
    teamId: t.id, name: me.name || me.email.split("@")[0], email: me.email.toLowerCase(), unsubscribeTokenHash: newToken().hash,
    userId: me.id, joinedAt: new Date(), ...start,
  }).onConflictDoUpdate({ target: [teamMember.teamId, teamMember.email], set: { userId: me.id, joinedAt: new Date() } });
  refresh(t.id);
  redirect(`/hive/${t.id}`);
}

// ---------- hierarchy, roles, Hive control ----------

/** Saves the whole chart after a drag: who sits under whom, and in what order. The admin always stays on top. */
export async function saveHierarchy(teamId: string, layout: { id: string; parentId: string | null; position: number }[]) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "hierarchy");
  const members = await db.select({ id: teamMember.id, isAdmin: teamMember.isAdmin }).from(teamMember).where(eq(teamMember.teamId, teamId));
  const ids = new Set(members.map((m) => m.id));
  const admin = members.find((m) => m.isAdmin);
  const parentOf = new Map<string, string | null>(layout.filter((l) => ids.has(l.id)).map((l) => [l.id, l.parentId && ids.has(l.parentId) && l.parentId !== l.id ? l.parentId : admin?.id ?? null]));
  if (admin) parentOf.set(admin.id, null);
  // anyone caught in a loop is moved directly under the admin
  for (const id of [...parentOf.keys()]) {
    const seen = new Set<string>();
    for (let cur: string | null | undefined = id; cur; cur = parentOf.get(cur)) { if (seen.has(cur)) { parentOf.set(id, admin?.id ?? null); break; } seen.add(cur); }
  }
  await db.transaction(async (tx) => {
    for (const l of layout) if (parentOf.has(l.id)) await tx.update(teamMember).set({ parentId: parentOf.get(l.id) ?? null, position: Math.max(0, Math.round(l.position)) }).where(eq(teamMember.id, l.id));
  });
  refresh(teamId);
}

/** Only the Leader (admin) hands out roles. An empty roleId makes them a plain member again. */
export async function setMemberRole(memberId: string, roleId: string) {
  const me = await requireUser();
  const m = await memberOf(memberId);
  await requireAdmin(me.id, m.teamId);
  if (m.isAdmin) throw new Error("The Leader's role can't be changed.");
  if (!roleId) {
    await db.update(teamMember).set({ roleId: null, perms: DEFAULT_PERMS }).where(eq(teamMember.id, memberId));
    return refresh(m.teamId);
  }
  const [r] = await db.select().from(teamRole).where(and(eq(teamRole.id, roleId), eq(teamRole.teamId, m.teamId)));
  if (!r) throw new Error("That role no longer exists.");
  if (r.isLeader) throw new Error("There's one Leader: the team's admin.");
  await db.update(teamMember).set({ roleId: r.id, perms: r.perms }).where(eq(teamMember.id, memberId)); // a new role resets their powers to the role's
  refresh(m.teamId);
}

/** "Hive control" for one person. Admin only, so nobody can hand themselves extra powers. */
export async function setMemberPerms(memberId: string, perms: string[]) {
  const me = await requireUser();
  const m = await memberOf(memberId);
  await requireAdmin(me.id, m.teamId);
  if (m.isAdmin) throw new Error("The admin always has every power.");
  await db.update(teamMember).set({ perms: cleanPerms(perms) }).where(eq(teamMember.id, memberId));
  refresh(m.teamId);
}

export async function saveRole(teamId: string, input: { id?: string; name: string; perms: string[]; applyToMembers?: boolean }) {
  const me = await requireUser();
  await requireAdmin(me.id, teamId);
  const name = text(input.name, 40);
  if (!name) throw new Error("Give the role a name.");
  const perms = cleanPerms(input.perms);
  const clash = await db.select({ id: teamRole.id }).from(teamRole).where(and(eq(teamRole.teamId, teamId), sql`lower(${teamRole.name}) = ${name.toLowerCase()}`));
  if (clash.some((c) => c.id !== input.id)) throw new Error(`There's already a role called “${name}”.`);
  if (input.id) {
    const [r] = await db.select().from(teamRole).where(and(eq(teamRole.id, input.id), eq(teamRole.teamId, teamId)));
    if (!r) throw new Error("That role no longer exists.");
    if (r.isLeader) { await db.update(teamRole).set({ name }).where(eq(teamRole.id, r.id)); return refresh(teamId); } // the Leader keeps every power
    await db.update(teamRole).set({ name, perms }).where(eq(teamRole.id, r.id));
    if (input.applyToMembers) await db.update(teamMember).set({ perms }).where(and(eq(teamMember.roleId, r.id), eq(teamMember.isAdmin, false)));
  } else {
    const n = await db.select({ id: teamRole.id }).from(teamRole).where(eq(teamRole.teamId, teamId));
    if (n.length >= 20) throw new Error("A team can have up to 20 roles.");
    await db.insert(teamRole).values({ teamId, name, perms, position: 99 });
  }
  refresh(teamId);
}

export async function deleteRole(roleId: string) {
  const me = await requireUser();
  const [r] = await db.select().from(teamRole).where(eq(teamRole.id, roleId));
  if (!r) return;
  await requireAdmin(me.id, r.teamId);
  if (r.isLeader) throw new Error("The Leader role belongs to the admin and can't be deleted.");
  await db.delete(teamRole).where(eq(teamRole.id, roleId)); // its members become plain members but keep their current powers
  refresh(r.teamId);
}

// ---------- The Comb ----------

export async function postToComb(teamId: string, body: string) {
  const me = await requireUser();
  const { me: member } = await requirePerm(me.id, teamId, "post");
  const b = text(body, 2000);
  if (!b) throw new Error("Write something first.");
  await db.insert(combPost).values({ teamId, memberId: member.id, body: b });
  refresh(teamId);
}

export async function deleteCombPost(postId: string) {
  const me = await requireUser();
  const [p] = await db.select().from(combPost).where(eq(combPost.id, postId));
  if (!p) return;
  const { me: member } = await teamAccess(me.id, p.teamId);
  if (p.memberId !== member.id && !member.isAdmin) throw new Error("You can only delete your own posts.");
  await db.delete(combPost).where(eq(combPost.id, postId));
  refresh(p.teamId);
}

/** Hide a post from the team (or bring it back). Needs the "hide" power; the Leader always has it. */
export async function hideCombPost(postId: string, hidden: boolean) {
  const me = await requireUser();
  const [p] = await db.select().from(combPost).where(eq(combPost.id, postId));
  if (!p) return;
  await requirePerm(me.id, p.teamId, "hide");
  await db.update(combPost).set({ hiddenAt: hidden ? new Date() : null }).where(eq(combPost.id, postId));
  refresh(p.teamId);
}

/** A member ticks their own part of a team task from inside the app (the email link does the same). */
export async function markMyPart(taskId: string, done: boolean) {
  const me = await requireUser();
  const [t] = await db.select({ teamId: task.teamId }).from(task).where(eq(task.id, taskId));
  const { me: member } = await teamAccess(me.id, t?.teamId);
  const [a] = await db.select().from(assignment).where(and(eq(assignment.taskId, taskId), eq(assignment.memberId, member.id)));
  if (!a) throw new Error("This task isn't assigned to you.");
  await db.update(assignment).set({ doneAt: done ? a.doneAt ?? new Date() : null, progress: done ? 100 : Math.min(a.progress, 99) }).where(eq(assignment.id, a.id));
  await syncTaskStatus(taskId);
  refresh(t.teamId!);
  revalidatePath(`/tasks/${taskId}`);
}

/** Done when every part is done; in progress once anyone has moved their slider. */
async function syncTaskStatus(taskId: string) {
  const parts = await db.select({ doneAt: assignment.doneAt, progress: assignment.progress }).from(assignment).where(eq(assignment.taskId, taskId));
  const status = parts.length && parts.every((p) => p.doneAt) ? "done" : parts.some((p) => p.doneAt || p.progress > 0) ? "doing" : "todo";
  await db.update(task).set({ status }).where(eq(task.id, taskId));
}

/** Your own part of a team task: move the slider, write what you did, or say it's done (or not). Every save is logged with its date. */
export async function logProgress(taskId: string, input: { progress: number; note?: string; done: boolean }) {
  const me = await requireUser();
  const [t] = await db.select({ teamId: task.teamId }).from(task).where(eq(task.id, taskId));
  const { me: member } = await teamAccess(me.id, t?.teamId);
  const [a] = await db.select().from(assignment).where(and(eq(assignment.taskId, taskId), eq(assignment.memberId, member.id)));
  if (!a) throw new Error("This task isn't assigned to you.");
  const done = Boolean(input.done);
  const progress = done ? 100 : Math.max(0, Math.min(99, Math.round(Number(input.progress) || 0)));
  const note = text(input.note, 500) || null;
  await db.transaction(async (tx) => {
    await tx.update(assignment).set({ progress, doneAt: done ? a.doneAt ?? new Date() : null }).where(eq(assignment.id, a.id));
    await tx.insert(progressLog).values({ assignmentId: a.id, teamId: t.teamId!, progress, done, note });
  });
  await syncTaskStatus(taskId);
  refresh(t.teamId!);
  revalidatePath(`/tasks/${taskId}`);
}

// ---------- Hive Vault ----------

const safeLink = (u: string) => {
  try { const x = new URL(u.trim().match(/^[a-z]+:\/\//i) ? u.trim() : `https://${u.trim()}`); return x.protocol === "http:" || x.protocol === "https:" ? x.toString() : null; } catch { return null; }
};

export async function addVaultLink(teamId: string, input: { title: string; url: string; note?: string }) {
  const me = await requireUser();
  const { me: member } = await requirePerm(me.id, teamId, "vault");
  const url = safeLink(String(input.url ?? ""));
  if (!url) throw new Error("That doesn't look like a web address. Paste the full link, starting with https://");
  const count = await db.select({ id: teamLink.id }).from(teamLink).where(eq(teamLink.teamId, teamId));
  if (count.length >= 300) throw new Error("The Vault holds up to 300 links. Remove some old ones first.");
  await db.insert(teamLink).values({ teamId, memberId: member.id, url, title: text(input.title, 120) || new URL(url).hostname.replace(/^www\./, ""), note: text(input.note, 300) || null });
  refresh(teamId);
}

export async function deleteVaultLink(linkId: string) {
  const me = await requireUser();
  const [l] = await db.select().from(teamLink).where(eq(teamLink.id, linkId));
  if (!l) return;
  await requirePerm(me.id, l.teamId, "vault");
  await db.delete(teamLink).where(eq(teamLink.id, linkId));
  refresh(l.teamId);
}

// ---------- team tasks and templates ----------

/** A blank team task, or one filled from a template ("Use template" is the second click). */
export async function newTeamTask(teamId: string, templateId?: string) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "tasks");
  const tpl = templateId ? (await db.select().from(template).where(and(eq(template.id, templateId), eq(template.teamId, teamId))))[0] : undefined;
  const id = await createTeamTask(me.id, teamId, tpl ?? null, null);
  redirect(`/tasks/${id}`);
}

export async function saveAsTemplate(taskId: string) {
  const me = await requireUser();
  const [t] = await db.select().from(task).where(eq(task.id, taskId));
  await requirePerm(me.id, t?.teamId, "templates");
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
  await requirePerm(me.id, tpl?.teamId, "templates");
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
  await requirePerm(me.id, tpl?.teamId, "templates");
  await db.delete(template).where(eq(template.id, id));
  refresh(tpl.teamId);
}

/** Emails assignees of this task who haven't been told yet. The task page calls it a minute after the last change, or on "Send now". */
export async function sendAssignmentEmails(taskId: string) {
  const me = await requireUser();
  const [t] = await db.select({ teamId: task.teamId, title: task.title }).from(task).where(eq(task.id, taskId));
  await requirePerm(me.id, t?.teamId, "tasks");
  if (!t.title.trim()) throw new Error("Give the task a title before emailing it.");
  const sent = await sendPendingAssignments(taskId);
  refresh(t.teamId!);
  return sent;
}
