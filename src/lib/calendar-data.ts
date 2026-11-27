import "server-only";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignment, task, team, teamMember } from "@/db/schema";
import { inTeamsICanManage } from "./team-sql";

/** Every dated task the user should see: personal ones plus tasks in teams they own. */
export async function datedTasks(userId: string) {
  return db
    .select({ id: task.id, title: task.title, status: task.status, dueAt: task.dueAt, hasTime: task.hasTime, importance: task.importance, teamId: task.teamId, teamName: team.name, teamColor: team.color, importanceColors: team.importanceColors })
    .from(task)
    .leftJoin(team, eq(task.teamId, team.id))
    // personal tasks, every task in teams you manage, and team tasks assigned to you
    .where(and(isNotNull(task.dueAt), or(
      and(eq(task.ownerId, userId), isNull(task.teamId)),
      inTeamsICanManage(userId, team.id),
      sql`${task.id} in (select ${assignment.taskId} from ${assignment} join ${teamMember} on ${teamMember.id} = ${assignment.memberId} where ${teamMember.userId} = ${userId})`,
    )));
}
