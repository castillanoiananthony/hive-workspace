import { sql, type SQL } from "drizzle-orm";
import { team, teamMember } from "@/db/schema";

/** `team.id in (teams this user has joined)`, for queries that should cover every team you belong to. */
export const inMyTeams = (userId: string, col: SQL | typeof team.id = team.id) =>
  sql`${col} in (select ${teamMember.teamId} from ${teamMember} where ${teamMember.userId} = ${userId})`;

/** Teams where this user may manage tasks (admin, or the "Create & assign tasks" power). */
export const inTeamsICanManage = (userId: string, col: SQL | typeof team.id = team.id) =>
  sql`${col} in (select ${teamMember.teamId} from ${teamMember} where ${teamMember.userId} = ${userId} and (${teamMember.isAdmin} or ${teamMember.perms} ? 'tasks'))`;
