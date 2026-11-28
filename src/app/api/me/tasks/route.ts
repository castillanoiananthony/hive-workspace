import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { offlineSnapshot } from "@/lib/offline-tasks";
import { eq } from "drizzle-orm";

// Your tasks, for the offline copy on this device. Never cached by the browser or the service worker.
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "signed out" }, { status: 401 });
  const [u] = await db.select({ id: user.id, timezone: user.timezone }).from(user).where(eq(user.id, session.user.id));
  if (!u) return Response.json({ error: "signed out" }, { status: 401 });
  return Response.json({ tasks: await offlineSnapshot(u) }, { headers: { "cache-control": "private, no-store" } });
}
