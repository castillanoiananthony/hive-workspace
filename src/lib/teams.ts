import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { team } from "@/db/schema";

/** The team if the user owns it; anything else is treated as "not found". */
export async function ownTeam(userId: string, teamId: string | null | undefined) {
  if (!teamId) throw new Error("That team no longer exists.");
  const [row] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.ownerId, userId)));
  if (!row) throw new Error("That team no longer exists.");
  return row;
}

export { TEAM_COLORS_CLIENT as TEAM_COLORS } from "@/app/(app)/hive/colors";
