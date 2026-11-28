"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignment, criterion, meetingNote, task, taskCriterion, teamLink, teamMember, teamStream } from "@/db/schema";
import { sendPendingAssignments } from "@/lib/buzz";
import { can } from "@/lib/hive-perms";
import { requireUser } from "@/lib/session";
import { parseStandup } from "@/lib/standup";
import { SUBJECT_COLORS } from "@/lib/student";
import { requirePerm, teamAccess } from "@/lib/teams";
import { newToken } from "@/lib/tokens";
import { VAULT_CATEGORIES } from "@/lib/link-kind";

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
const refresh = (teamId: string) => revalidatePath(`/hive/${teamId}`);
async function active(userId: string, teamId: string) {
  const a = await teamAccess(userId, teamId);
  if (a.team.archivedAt) throw new Error("This hive is archived, so it's read-only.");
  return a;
}

// ---------- workstreams ----------

export async function addStream(teamId: string, name: string) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "tasks");
  const n = clean(name, 30);
  if (!n) throw new Error("Name the workstream, e.g. Frontend.");
  const all = await db.select({ id: teamStream.id, name: teamStream.name }).from(teamStream).where(eq(teamStream.teamId, teamId));
  if (all.length >= 12) throw new Error("A hive can have up to 12 workstreams.");
  if (all.some((s) => s.name.toLowerCase() === n.toLowerCase())) throw new Error(`There's already a ${n} stream.`);
  await db.insert(teamStream).values({ teamId, name: n, color: SUBJECT_COLORS[all.length % SUBJECT_COLORS.length], position: all.length });
  refresh(teamId);
}

export async function deleteStream(id: string) {
  const me = await requireUser();
  const [s] = await db.select().from(teamStream).where(eq(teamStream.id, id));
  if (!s) return;
  await requirePerm(me.id, s.teamId, "tasks");
  await db.delete(teamStream).where(eq(teamStream.id, id)); // its tasks stay, untagged
  refresh(s.teamId);
}

/** Pick the workstreams you're on (used by the "My streams" filter). */
export async function setMyStreams(teamId: string, streamIds: string[]) {
  const me = await requireUser();
  const { me: m } = await active(me.id, teamId);
  const valid = await db.select({ id: teamStream.id }).from(teamStream).where(eq(teamStream.teamId, teamId));
  const keep = (Array.isArray(streamIds) ? streamIds : []).filter((id) => valid.some((v) => v.id === id));
  await db.update(teamMember).set({ streams: keep }).where(eq(teamMember.id, m.id));
  refresh(teamId);
}

// ---------- standup / meeting notes ----------

async function people(teamId: string) {
  return db.select({ id: teamMember.id, name: teamMember.name, nickname: teamMember.nickname }).from(teamMember).where(and(eq(teamMember.teamId, teamId), eq(teamMember.access, "member")));
}

/** What the note would turn into, before anything is created. */
export async function previewStandup(teamId: string, body: string) {
  const me = await requireUser();
  await active(me.id, teamId);
  return parseStandup(clean(body, 8000), await people(teamId), me.timezone).map((p) => ({ ...p, dueAt: p.dueAt?.toISOString() ?? null }));
}

/** Saves the note; with createTasks (needs the tasks power), each "@Name …" line becomes a task assigned to them, and Buzz emails them. */
export async function saveStandup(teamId: string, body: string, createTasks: boolean) {
  const me = await requireUser();
  const { me: m } = await active(me.id, teamId);
  const text = clean(body, 8000);
  if (!text) throw new Error("Write the notes first.");
  const ids: string[] = [];
  if (createTasks) {
    if (!can(m, "tasks")) throw new Error("Only people who can create tasks can turn notes into tasks. The note was not saved.");
    for (const p of parseStandup(text, await people(teamId), me.timezone)) {
      if (!p.memberId) continue;
      const [row] = await db.insert(task).values({ ownerId: me.id, teamId, title: p.title.slice(0, 200), dueAt: p.dueAt, hasTime: p.hasTime }).returning({ id: task.id });
      await db.insert(assignment).values({ taskId: row.id, memberId: p.memberId, doneTokenHash: newToken().hash });
      ids.push(row.id);
    }
  }
  await db.insert(meetingNote).values({ teamId, memberId: m.id, body: text, taskIds: ids });
  for (const id of ids) await sendPendingAssignments(id).catch(() => 0); // Buzz: the usual "you have a new task" email
  refresh(teamId);
  return { tasks: ids.length };
}

// ---------- judging criteria ----------

/** Paste the criteria, one per line. */
export async function addCriteria(teamId: string, text: string) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "tasks");
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, "").trim().slice(0, 300)).filter(Boolean);
  const have = await db.select({ id: criterion.id }).from(criterion).where(eq(criterion.teamId, teamId));
  const room = Math.max(0, 30 - have.length);
  if (!lines.length) throw new Error("Paste at least one criterion.");
  await db.insert(criterion).values(lines.slice(0, room).map((t, i) => ({ teamId, text: t, position: have.length + i })));
  refresh(teamId);
}

export async function deleteCriterion(id: string) {
  const me = await requireUser();
  const [c] = await db.select().from(criterion).where(eq(criterion.id, id));
  if (!c) return;
  await requirePerm(me.id, c.teamId, "tasks");
  await db.delete(criterion).where(eq(criterion.id, id));
  refresh(c.teamId);
}

export async function linkCriterion(criterionId: string, taskId: string, on: boolean) {
  const me = await requireUser();
  const [c] = await db.select().from(criterion).where(eq(criterion.id, criterionId));
  if (!c) throw new Error("That criterion no longer exists.");
  await requirePerm(me.id, c.teamId, "tasks");
  const [t] = await db.select({ id: task.id }).from(task).where(and(eq(task.id, taskId), eq(task.teamId, c.teamId)));
  if (!t) throw new Error("That task isn't in this hive.");
  if (on) await db.insert(taskCriterion).values({ taskId, criterionId }).onConflictDoNothing();
  else await db.delete(taskCriterion).where(and(eq(taskCriterion.taskId, taskId), eq(taskCriterion.criterionId, criterionId)));
  refresh(c.teamId);
}

// ---------- who's working now ----------

/** Switch "Working now" on (with an optional status) or off. It lapses after 3 hours without activity. */
export async function setWorking(teamId: string, on: boolean, note?: string) {
  const me = await requireUser();
  const { me: m } = await active(me.id, teamId);
  await db.update(teamMember).set(on ? { workingAt: new Date(), workingNote: clean(note, 80) || null } : { workingAt: null, workingNote: null }).where(eq(teamMember.id, m.id));
  refresh(teamId);
}

/** Sent every few minutes while the hive page is open, so an active person stays "working". */
export async function workingHeartbeat(teamId: string) {
  const me = await requireUser();
  const { me: m } = await teamAccess(me.id, teamId);
  if (m.workingAt && Date.now() - m.workingAt.getTime() < 3 * 3_600_000) await db.update(teamMember).set({ workingAt: new Date() }).where(eq(teamMember.id, m.id));
}

// ---------- Resource Library (Hive Vault) pins ----------


export async function setLinkMeta(linkId: string, patch: { pinned?: boolean; category?: string | null }) {
  const me = await requireUser();
  const [l] = await db.select().from(teamLink).where(eq(teamLink.id, linkId));
  if (!l) throw new Error("That link no longer exists.");
  await requirePerm(me.id, l.teamId, "vault");
  const set: Partial<typeof teamLink.$inferInsert> = {};
  if (patch.pinned !== undefined) set.pinned = Boolean(patch.pinned);
  if (patch.category !== undefined) set.category = VAULT_CATEGORIES.includes(String(patch.category)) ? String(patch.category) : null;
  await db.update(teamLink).set(set).where(eq(teamLink.id, linkId));
  refresh(l.teamId);
}
