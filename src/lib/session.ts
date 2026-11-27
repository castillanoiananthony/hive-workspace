import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getSession } from "./auth";

/** The signed-in user's row, or a redirect to /login. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [row] = await db.select().from(user).where(eq(user.id, session.user.id));
  if (!row) redirect("/login");
  return row;
}
