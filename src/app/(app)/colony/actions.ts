"use server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { colony, colonyMember, colonyPost, combPost, emailLog, milestone, peerEval, peerResponse, task, team, teamMember, user } from "@/db/schema";
import { addToSwarm, cleanCode, colonyAccess, makeJoinCode, requireQueen, swarmOf } from "@/lib/colony";
import { zonedToUtc } from "@/lib/dates";
import { announcementEmail, sendEmail } from "@/lib/email";
import { requireUser } from "@/lib/session";
import { createTeamWithAdmin, TEAM_COLORS } from "@/lib/teams";
import { unsubscribeLinks } from "@/lib/buzz";

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
const app = () => process.env.APP_URL ?? "http://localhost:3000";
const refresh = (id: string) => { revalidatePath(`/colony/${id}`); revalidatePath("/hive"); };
const DEFAULT_CRITERIA = ["Did their share of the work", "Quality of their work", "Communication with the group", "Met deadlines"];

async function uniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = makeJoinCode();
    const [hit] = await db.select({ id: colony.id }).from(colony).where(eq(colony.joinCode, code));
    if (!hit) return code;
  }
  throw new Error("Couldn't make a join code. Try again.");
}

export async function createColony(name: string) {
  const me = await requireUser();
  const n = clean(name, 80);
  if (!n) throw new Error("Give your class a name, e.g. ASE 111 – Section B.");
  const [c] = await db.insert(colony).values({ name: n, queenId: me.id, joinCode: await uniqueCode() }).returning({ id: colony.id });
  revalidatePath("/hive");
  redirect(`/colony/${c.id}`);
}

export async function joinColony(code: string) {
  const me = await requireUser();
  const [c] = await db.select().from(colony).where(eq(colony.joinCode, cleanCode(code)));
  if (!c) throw new Error("No class has that code. Check it with your teacher: it's 6 letters and numbers.");
  if (c.queenId !== me.id) await db.insert(colonyMember).values({ colonyId: c.id, userId: me.id }).onConflictDoNothing();
  revalidatePath("/hive");
  redirect(`/colony/${c.id}`);
}

export async function updateColony(id: string, patch: { name?: string; selfSwarm?: boolean; newCode?: boolean }) {
  const me = await requireUser();
  await requireQueen(me.id, id);
  const set: Partial<typeof colony.$inferInsert> = {};
  if (patch.name !== undefined) { set.name = clean(patch.name, 80); if (!set.name) throw new Error("A class needs a name."); }
  if (patch.selfSwarm !== undefined) set.selfSwarm = Boolean(patch.selfSwarm);
  if (patch.newCode) set.joinCode = await uniqueCode();
  await db.update(colony).set(set).where(eq(colony.id, id));
  refresh(id);
}

// ---------- swarms ----------

async function student(colonyId: string, userId: string) {
  const [u] = await db.select({ id: user.id, name: user.name, email: user.email }).from(colonyMember).innerJoin(user, eq(colonyMember.userId, user.id))
    .where(and(eq(colonyMember.colonyId, colonyId), eq(colonyMember.userId, userId)));
  if (!u) throw new Error("That student isn't in this class.");
  if (await swarmOf(u.id, colonyId)) throw new Error(`${u.name || u.email} is already in a swarm.`);
  return u;
}

/** Queen Bee: makes a swarm led by a student. Student (if allowed): makes their own and leads it. The Queen joins every swarm as Adviser. */
export async function createSwarm(colonyId: string, input: { name: string; leaderId?: string }) {
  const me = await requireUser();
  const a = await colonyAccess(me.id, colonyId);
  const name = clean(input.name, 80);
  if (!name) throw new Error("Give the swarm a name.");
  if (a.isStudent && !a.colony.selfSwarm) throw new Error("Your teacher makes the swarms in this class.");
  const leader = await student(colonyId, a.isQueen ? clean(input.leaderId, 64) : me.id);
  const count = await db.select({ id: team.id }).from(team).where(eq(team.colonyId, colonyId));
  const id = await createTeamWithAdmin(leader, name, TEAM_COLORS[count.length % TEAM_COLORS.length], ["Leader", "Member"]);
  await db.update(team).set({ colonyId }).where(eq(team.id, id));
  const [queen] = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, a.colony.queenId));
  await addToSwarm(id, queen, "adviser");
  refresh(colonyId);
  if (a.isStudent) redirect(`/hive/${id}`);
}

export async function addStudentToSwarm(teamId: string, userId: string) {
  const me = await requireUser();
  const [t] = await db.select().from(team).where(eq(team.id, teamId));
  if (!t?.colonyId) throw new Error("That swarm no longer exists.");
  await requireQueen(me.id, t.colonyId);
  await addToSwarm(teamId, await student(t.colonyId, userId), "member");
  refresh(t.colonyId); revalidatePath(`/hive/${teamId}`);
}

/** A student joins a swarm themselves (only when the Queen Bee allows students to form swarms). */
export async function joinSwarm(teamId: string) {
  const me = await requireUser();
  const [t] = await db.select().from(team).where(eq(team.id, teamId));
  if (!t?.colonyId) throw new Error("That swarm no longer exists.");
  const a = await colonyAccess(me.id, t.colonyId);
  if (!a.isStudent || !a.colony.selfSwarm) throw new Error("Your teacher places students in swarms in this class.");
  await addToSwarm(teamId, await student(t.colonyId, me.id), "member");
  refresh(t.colonyId);
  redirect(`/hive/${teamId}`);
}

// ---------- milestones, projects, announcements ----------

export async function addMilestone(colonyId: string, input: { title: string; date: string }) {
  const me = await requireUser();
  await requireQueen(me.id, colonyId);
  const title = clean(input.title, 120), date = clean(input.date, 10);
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("A milestone needs a name and a date.");
  await db.insert(milestone).values({ colonyId, title, dueAt: zonedToUtc(date, "23:59", me.timezone) });
  refresh(colonyId);
  const swarms = await db.select({ id: team.id }).from(team).where(eq(team.colonyId, colonyId));
  for (const s of swarms) revalidatePath(`/hive/${s.id}`);
}

export async function deleteMilestone(id: string) {
  const me = await requireUser();
  const [m] = await db.select().from(milestone).where(eq(milestone.id, id));
  if (!m) return;
  await requireQueen(me.id, m.colonyId);
  await db.delete(milestone).where(eq(milestone.id, id));
  refresh(m.colonyId);
}

/** Copies a project (a list of tasks) into every swarm at once. Each swarm gets its own tasks to split and assign. */
export async function assignProject(colonyId: string, tasks: { title: string; date?: string; steps?: string }[]) {
  const me = await requireUser();
  await requireQueen(me.id, colonyId);
  const list = (Array.isArray(tasks) ? tasks : []).map((t) => ({ title: clean(t.title, 200), date: clean(t.date, 10), steps: clean(t.steps, 4000) })).filter((t) => t.title).slice(0, 30);
  if (!list.length) throw new Error("Add at least one task to the project.");
  const swarms = await db.select({ id: team.id }).from(team).where(eq(team.colonyId, colonyId));
  if (!swarms.length) throw new Error("Make some swarms first; the project is copied into each one.");
  const doc = (s: string) => (s ? { type: "doc", content: s.split(/\n+/).map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })) } : null);
  await db.insert(task).values(swarms.flatMap((s) => list.map((t) => ({
    ownerId: me.id, teamId: s.id, title: t.title, howTo: doc(t.steps),
    dueAt: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? zonedToUtc(t.date, "23:59", me.timezone) : null, hasTime: false,
  }))));
  for (const s of swarms) revalidatePath(`/hive/${s.id}`);
  refresh(colonyId);
  return { swarms: swarms.length, tasks: list.length };
}

/** Posts on every swarm's Comb and emails each student through Buzz (once each, skipping anyone who turned Buzz off). */
export async function announce(colonyId: string, body: string) {
  const me = await requireUser();
  const { colony: c } = await requireQueen(me.id, colonyId);
  const text = clean(body, 2000);
  if (!text) throw new Error("Write the announcement first.");
  const [post] = await db.insert(colonyPost).values({ colonyId, body: text }).returning({ id: colonyPost.id });
  const swarms = await db.select({ id: team.id }).from(team).where(eq(team.colonyId, colonyId));
  const ids = swarms.map((s) => s.id);
  const queenRows = ids.length ? await db.select({ id: teamMember.id, teamId: teamMember.teamId }).from(teamMember).where(and(inArray(teamMember.teamId, ids), eq(teamMember.userId, me.id))) : [];
  if (queenRows.length) await db.insert(combPost).values(queenRows.map((q) => ({ teamId: q.teamId, memberId: q.id, body: `Class announcement:\n\n${text}` })));
  const students = ids.length ? await db.select().from(teamMember).where(and(inArray(teamMember.teamId, ids), eq(teamMember.access, "member"), isNull(teamMember.unsubscribedAt))) : [];
  // shortcut: sent one by one here; Phase 5's daily digest will batch these to stay under the email provider's daily limit
  let sent = 0, skipped = 0;
  for (const s of students) {
    if (sent >= 80) { skipped++; continue; } // stay well under the free plan's 100 emails a day
    const key = `announce:${post.id}:${s.id}`;
    const claimed = await db.insert(emailLog).values({ teamId: s.teamId, memberId: s.id, kind: "announce", recipient: s.email, dedupeKey: key }).onConflictDoNothing().returning({ id: emailLog.id });
    if (!claimed.length) continue;
    const unsub = await unsubscribeLinks(s.id); // the same stable link every Buzz email uses
    const mail = announcementEmail({ className: c.name, body: text, url: `${app()}/colony/${colonyId}`, unsubscribeUrl: unsub.page });
    try {
      const pid = await sendEmail(s.email, `${c.name}: new announcement`, mail.html, mail.text);
      await db.update(emailLog).set({ status: "sent", providerId: pid ?? null, sentAt: new Date() }).where(eq(emailLog.id, claimed[0].id)); sent++;
    } catch (e) {
      await db.update(emailLog).set({ status: "failed", error: e instanceof Error ? e.message.slice(0, 300) : "failed" }).where(eq(emailLog.id, claimed[0].id));
    }
  }
  refresh(colonyId);
  for (const s of swarms) revalidatePath(`/hive/${s.id}`);
  return { swarms: queenRows.length, emailed: sent, skipped };
}

// ---------- peer evaluation ----------

export async function createPeerEval(colonyId: string, input: { title: string; criteria?: string[] }) {
  const me = await requireUser();
  await requireQueen(me.id, colonyId);
  const title = clean(input.title, 120) || "Peer evaluation";
  const criteria = (input.criteria?.length ? input.criteria : DEFAULT_CRITERIA).map((c) => clean(c, 80)).filter(Boolean).slice(0, 8);
  await db.insert(peerEval).values({ colonyId, title, criteria });
  refresh(colonyId);
}

export async function setPeerEval(id: string, patch: { open?: boolean; showToStudents?: boolean }) {
  const me = await requireUser();
  const [e] = await db.select().from(peerEval).where(eq(peerEval.id, id));
  if (!e) throw new Error("That evaluation no longer exists.");
  await requireQueen(me.id, e.colonyId);
  await db.update(peerEval).set({ ...(patch.open !== undefined ? { open: Boolean(patch.open) } : {}), ...(patch.showToStudents !== undefined ? { showToStudents: Boolean(patch.showToStudents) } : {}) }).where(eq(peerEval.id, id));
  refresh(e.colonyId);
}

/** A student rates their swarm-mates (not themselves). Re-submitting replaces their earlier answers. */
export async function submitPeerEval(evalId: string, ratings: { rateeId: string; scores: number[]; comment?: string }[]) {
  const me = await requireUser();
  const [e] = await db.select().from(peerEval).where(eq(peerEval.id, evalId));
  if (!e || !e.open) throw new Error("This evaluation is closed.");
  const a = await colonyAccess(me.id, e.colonyId);
  if (!a.isStudent) throw new Error("Only students fill in the peer evaluation.");
  const sw = await swarmOf(me.id, e.colonyId);
  if (!sw) throw new Error("Join a swarm first.");
  const mates = await db.select({ id: teamMember.id, userId: teamMember.userId }).from(teamMember).where(and(eq(teamMember.teamId, sw.id), eq(teamMember.access, "member")));
  const valid = (Array.isArray(ratings) ? ratings : []).filter((r) => mates.some((m) => m.id === r.rateeId && m.userId !== me.id));
  if (!valid.length) throw new Error("Rate at least one swarm-mate.");
  for (const r of valid) {
    const scores = e.criteria.map((_, i) => Math.max(1, Math.min(5, Math.round(Number(r.scores?.[i]) || 3))));
    await db.insert(peerResponse).values({ evalId, teamId: sw.id, raterId: me.id, rateeId: r.rateeId, scores, comment: clean(r.comment, 500) || null })
      .onConflictDoUpdate({ target: [peerResponse.evalId, peerResponse.raterId, peerResponse.rateeId], set: { scores, comment: clean(r.comment, 500) || null, createdAt: new Date() } });
  }
  refresh(e.colonyId);
}
