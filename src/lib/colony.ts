import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, inArray, isNotNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignment, colony, colonyMember, combPost, contribution, progressLog, task, team, teamMember } from "@/db/schema";
import { DEFAULT_PERMS } from "./hive-perms";
import { newToken } from "./tokens";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O/0, I/1/L
export const makeJoinCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export type ColonyAccess = { colony: typeof colony.$inferSelect; isQueen: boolean; isStudent: boolean };

/** The class plus your place in it. Anyone outside it gets "not found". */
export async function colonyAccess(userId: string, colonyId: string): Promise<ColonyAccess> {
  const [c] = await db.select().from(colony).where(eq(colony.id, colonyId));
  if (!c) throw new Error("That class no longer exists.");
  if (c.queenId === userId) return { colony: c, isQueen: true, isStudent: false };
  const [m] = await db.select({ u: colonyMember.userId }).from(colonyMember).where(and(eq(colonyMember.colonyId, colonyId), eq(colonyMember.userId, userId)));
  if (!m) throw new Error("That class no longer exists.");
  return { colony: c, isQueen: false, isStudent: true };
}

export async function requireQueen(userId: string, colonyId: string) {
  const a = await colonyAccess(userId, colonyId);
  if (!a.isQueen) throw new Error("Only the class's Queen Bee can do that.");
  return a;
}

/** The swarm (team) a student is in for this class, if any. */
export async function swarmOf(userId: string, colonyId: string) {
  const [r] = await db.select({ id: team.id, name: team.name }).from(teamMember).innerJoin(team, eq(teamMember.teamId, team.id))
    .where(and(eq(team.colonyId, colonyId), eq(teamMember.userId, userId)));
  return r ?? null;
}

/** Adds a signed-up person to a swarm. The Queen Bee joins as an Adviser: sees and comments, never edits. */
export async function addToSwarm(teamId: string, u: { id: string; name: string; email: string }, as: "member" | "adviser") {
  const [admin] = await db.select({ id: teamMember.id }).from(teamMember).where(and(eq(teamMember.teamId, teamId), eq(teamMember.isAdmin, true)));
  await db.insert(teamMember).values({
    teamId, userId: u.id, joinedAt: new Date(), name: u.name || u.email.split("@")[0], email: u.email.toLowerCase(), unsubscribeTokenHash: newToken().hash,
    access: as, perms: as === "member" ? DEFAULT_PERMS : [], parentId: as === "member" ? admin?.id ?? null : null,
  }).onConflictDoNothing();
}

export type SwarmStat = { id: string; name: string; color: string; members: number; progress: number; open: number; overdue: number; lastActivity: Date | null; quiet: boolean };

/** One row per swarm for the class dashboard. "Quiet" = nothing happened for 5+ days. */
export async function swarmStats(colonyId: string, now = Date.now()): Promise<SwarmStat[]> {
  const swarms = await db.select().from(team).where(eq(team.colonyId, colonyId)).orderBy(team.name);
  if (!swarms.length) return [];
  const ids = swarms.map((s) => s.id);
  const [members, tasks, parts, logs, contribs, posts] = await Promise.all([
    db.select({ teamId: teamMember.teamId, n: sql<number>`count(*)::int` }).from(teamMember).where(and(inArray(teamMember.teamId, ids), eq(teamMember.access, "member"))).groupBy(teamMember.teamId),
    db.select({ teamId: task.teamId, status: task.status, dueAt: task.dueAt, createdAt: task.createdAt }).from(task).where(inArray(task.teamId, ids)),
    db.select({ teamId: task.teamId, doneAt: assignment.doneAt, progress: assignment.progress }).from(assignment).innerJoin(task, eq(assignment.taskId, task.id)).where(inArray(task.teamId, ids)),
    db.select({ teamId: progressLog.teamId, at: max(progressLog.createdAt) }).from(progressLog).where(inArray(progressLog.teamId, ids)).groupBy(progressLog.teamId),
    db.select({ teamId: contribution.teamId, at: max(contribution.createdAt) }).from(contribution).where(inArray(contribution.teamId, ids)).groupBy(contribution.teamId),
    db.select({ teamId: combPost.teamId, at: max(combPost.createdAt) }).from(combPost).where(and(inArray(combPost.teamId, ids), isNotNull(combPost.memberId))).groupBy(combPost.teamId),
  ]);
  const DAY = 86_400_000;
  return swarms.map((s) => {
    const ts = tasks.filter((t) => t.teamId === s.id), ps = parts.filter((p) => p.teamId === s.id);
    const progress = ps.length ? Math.round(ps.reduce((a, p) => a + (p.doneAt ? 100 : p.progress), 0) / ps.length)
      : ts.length ? Math.round((100 * ts.filter((t) => t.status === "done").length) / ts.length) : 0;
    const times = [...logs, ...contribs, ...posts].filter((r) => r.teamId === s.id && r.at).map((r) => new Date(r.at!).getTime());
    const last = times.length ? new Date(Math.max(...times)) : null;
    const since = last ? last.getTime() : s.createdAt.getTime();
    return {
      id: s.id, name: s.name, color: s.color, members: members.find((m) => m.teamId === s.id)?.n ?? 0, progress,
      open: ts.filter((t) => t.status !== "done").length, overdue: ts.filter((t) => t.status !== "done" && t.dueAt && t.dueAt.getTime() < now).length,
      lastActivity: last, quiet: now - since >= 5 * DAY,
    };
  });
}
