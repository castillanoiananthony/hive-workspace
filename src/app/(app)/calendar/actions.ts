"use server";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goal, task, team, user } from "@/db/schema";
import { zonedToUtc } from "@/lib/dates";
import { requireUser } from "@/lib/session";

/** Move a task to a new day (and time, if it has one). Works for personal tasks and tasks in teams you own. */
export async function rescheduleTask(id: string, date: string, time: string | null) {
  const me = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (time !== null && !/^\d{2}:\d{2}$/.test(time))) throw new Error("That date doesn't look right.");
  const [row] = await db.select({ id: task.id, ownerId: task.ownerId, goalId: task.goalId, teamOwner: team.ownerId })
    .from(task).leftJoin(team, eq(task.teamId, team.id)).where(eq(task.id, id));
  if (!row || (row.teamOwner ? row.teamOwner !== me.id : row.ownerId !== me.id)) throw new Error("That task no longer exists.");
  await db.update(task).set({ dueAt: zonedToUtc(date, time, me.timezone), hasTime: time !== null }).where(eq(task.id, id));
  if (row.goalId) await db.update(goal).set({ lastActivityAt: new Date() }).where(and(eq(goal.id, row.goalId), eq(goal.ownerId, me.id)));
  revalidatePath("/calendar");
  revalidatePath("/cell");
}

/** Returns the private feed token, creating one the first time; `regenerate` kills the old link. */
export async function icsToken(regenerate = false) {
  const me = await requireUser();
  if (me.icsToken && !regenerate) return me.icsToken;
  const token = randomBytes(24).toString("base64url"); // 32 characters, 192 bits
  await db.update(user).set({ icsToken: token }).where(eq(user.id, me.id));
  revalidatePath("/settings");
  return token;
}
