import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { team, teamMember, teamRole } from "@/db/schema";
import { ALL_PERMS, can, presetPerms, ROLE_PRESETS, type Perm } from "./hive-perms";
import { newToken } from "./tokens";

export { TEAM_COLORS_CLIENT as TEAM_COLORS } from "@/app/(app)/hive/colors";

export type Access = { team: typeof team.$inferSelect; me: typeof teamMember.$inferSelect };

/** The team plus your own member row, if you've joined it. Anything else is "not found" so team ids don't leak. */
export async function teamAccess(userId: string, teamId: string | null | undefined): Promise<Access> {
  if (!teamId) throw new Error("That team no longer exists.");
  const [row] = await db.select({ t: team, m: teamMember }).from(team)
    .innerJoin(teamMember, and(eq(teamMember.teamId, team.id), eq(teamMember.userId, userId)))
    .where(eq(team.id, teamId));
  if (!row) throw new Error("That team no longer exists.");
  return { team: row.t, me: row.m };
}

/** Same, but also requires one "Hive control" power (the admin has them all). */
export async function requirePerm(userId: string, teamId: string | null | undefined, perm: Perm): Promise<Access> {
  const a = await teamAccess(userId, teamId);
  if (a.team.archivedAt) throw new Error("This hive is archived, so it's read-only. The Leader can bring it back in Team settings.");
  if (!can(a.me, perm)) throw new Error("You don't have permission to do that in this team. Ask the team's admin.");
  return a;
}

export async function requireAdmin(userId: string, teamId: string | null | undefined): Promise<Access> {
  const a = await teamAccess(userId, teamId);
  if (!a.me.isAdmin) throw new Error("Only the team's admin can do that.");
  return a;
}

/** Every team you belong to, as admin or member. */
export async function myTeams(userId: string) {
  return db.select({ t: team, m: teamMember }).from(teamMember).innerJoin(team, eq(teamMember.teamId, team.id)).where(eq(teamMember.userId, userId));
}

/**
 * Called on every signed-in page load: an invite sent to this email becomes a real membership the moment
 * its owner has an account. Cheap when there's nothing to link.
 */
export async function linkInvites(userId: string, email: string) {
  await db.update(teamMember).set({ userId, joinedAt: new Date() })
    .where(and(isNull(teamMember.userId), sql`lower(${teamMember.email}) = ${email.toLowerCase()}`));
}

/** Role names from the New team dialog: first one is the Leader. Trims, drops blanks and repeats, caps at 12. */
export function cleanRoleNames(names: string[] | undefined) {
  const seen = new Set<string>(), out: string[] = [];
  for (const n of names ?? []) { const v = String(n).trim().slice(0, 40); if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); } }
  if (!out.length) out.push("Leader");
  return out.slice(0, 12);
}

/** A new team: the creator is its admin, holding the first (Leader) role. */
export async function createTeamWithAdmin(owner: { id: string; name: string; email: string }, name: string, color: string, roleNames: string[] = [...ROLE_PRESETS[0].roles]) {
  const names = cleanRoleNames(roleNames);
  return db.transaction(async (tx) => {
    const [t] = await tx.insert(team).values({ ownerId: owner.id, name, color }).returning({ id: team.id });
    const roles = await tx.insert(teamRole).values(names.map((n, i) => ({ teamId: t.id, name: n, perms: presetPerms(i), position: i, isLeader: i === 0 }))).returning({ id: teamRole.id, isLeader: teamRole.isLeader });
    await tx.insert(teamMember).values({
      teamId: t.id, name: owner.name || owner.email.split("@")[0], email: owner.email.toLowerCase(), unsubscribeTokenHash: newToken().hash,
      userId: owner.id, joinedAt: new Date(), isAdmin: true, perms: ALL_PERMS, roleId: roles.find((r) => r.isLeader)!.id,
    });
    return t.id;
  });
}

/** Older teams (made before roles existed) get the starter roles the first time someone opens them. */
export async function ensureRoles(teamId: string) {
  const [has] = await db.select({ id: teamRole.id }).from(teamRole).where(eq(teamRole.teamId, teamId)).limit(1);
  if (has) return;
  // two page loads at once both get here: the unique indexes make the second insert a no-op instead of duplicates
  await db.insert(teamRole).values(ROLE_PRESETS[0].roles.map((n, i) => ({ teamId, name: n, perms: presetPerms(i), position: i, isLeader: i === 0 }))).onConflictDoNothing();
  const [leader] = await db.select({ id: teamRole.id }).from(teamRole).where(and(eq(teamRole.teamId, teamId), eq(teamRole.isLeader, true)));
  if (leader) await db.update(teamMember).set({ roleId: leader.id, perms: ALL_PERMS }).where(and(eq(teamMember.teamId, teamId), eq(teamMember.isAdmin, true)));
}

export const displayName = (m: { nickname: string | null; name: string }) => m.nickname?.trim() || m.name;
