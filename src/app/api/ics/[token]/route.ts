import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { datedTasks } from "@/lib/calendar-data";
import { utcToZoned } from "@/lib/dates";
import { buildIcs } from "@/lib/ics";

// Public by design: calendar apps fetch this without signing in, so the long random token is the key.
export async function GET(_req: Request, ctx: RouteContext<"/api/ics/[token]">) {
  const token = (await ctx.params).token.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) return new Response("Not found", { status: 404 });
  const [me] = await db.select({ id: user.id, name: user.name, tz: user.timezone }).from(user).where(eq(user.icsToken, token));
  if (!me) return new Response("Not found", { status: 404 });
  const app = process.env.APP_URL ?? "http://localhost:3000";
  const rows = await datedTasks(me.id);
  const body = buildIcs(`HIVE-WORKSPACE${me.name ? ` (${me.name})` : ""}`, rows.map((t) => ({
    uid: t.id, title: t.title, start: t.dueAt!, allDay: !t.hasTime, date: utcToZoned(t.dueAt!, me.tz).date,
    url: `${app}/tasks/${t.id}`, done: t.status === "done", calendar: t.teamName ?? undefined,
  })));
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="hive-workspace.ics"',
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
