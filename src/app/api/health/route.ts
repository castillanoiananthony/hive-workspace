import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

// Liveness check for the app and its database; reveals nothing beyond up/down.
export async function GET() {
  await connection(); // run on every request, never prerendered
  try {
    await db.execute(sql`select 1 from "user" limit 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
