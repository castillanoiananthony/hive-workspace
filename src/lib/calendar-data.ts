import "server-only";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { task, team } from "@/db/schema";

/** Every dated task the user should see: personal ones plus tasks in teams they own. */
export async function datedTasks(userId: string) {
  return db
    .select({ id: task.id, title: task.title, status: task.status, dueAt: task.dueAt, hasTime: task.hasTime, teamId: task.teamId, teamName: team.name, teamColor: team.color })
    .from(task)
    .leftJoin(team, eq(task.teamId, team.id))
    .where(and(isNotNull(task.dueAt), or(and(eq(task.ownerId, userId), isNull(task.teamId)), eq(team.ownerId, userId))));
}
