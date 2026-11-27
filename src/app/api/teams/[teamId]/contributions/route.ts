import { getSession } from "@/lib/auth";
import { contributionRows } from "@/lib/contribution-rows";
import { toCsv } from "@/lib/csv";
import { teamAccess } from "@/lib/teams";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

// CSV download of a team's contribution log. Members and advisers only (guests see tasks and The Comb).
export async function GET(req: Request, ctx: RouteContext<"/api/teams/[teamId]/contributions">) {
  const { teamId } = await ctx.params;
  const session = await getSession();
  if (!session) return new Response("Not found", { status: 404 });
  const access = await teamAccess(session.user.id, teamId).catch(() => null);
  if (!access || access.me.access === "guest") return new Response("Not found", { status: 404 });
  const member = new URL(req.url).searchParams.get("member");
  const [u] = await db.select({ tz: user.timezone }).from(user).where(eq(user.id, session.user.id));
  const csv = toCsv(await contributionRows(teamId, member), u?.tz ?? "Asia/Manila");
  const slug = access.team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
  return new Response("﻿" + csv, { // BOM so Excel opens Filipino names (ñ) correctly
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${slug}-contributions.csv"`, "cache-control": "private, no-store" },
  });
}
