import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userImage } from "@/db/schema";
import { getSession } from "@/lib/auth";

// Profile pictures and banners are only shown inside the app, so only signed-in people can load them.
export async function GET(_req: Request, ctx: RouteContext<"/api/profile-image/[userId]/[kind]">) {
  const { userId, kind } = await ctx.params;
  if (!(await getSession())) return new Response("Not found", { status: 404 });
  if (kind !== "avatar" && kind !== "banner") return new Response("Not found", { status: 404 });
  const [img] = await db.select({ data: userImage.data }).from(userImage).where(and(eq(userImage.userId, userId), eq(userImage.kind, kind)));
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    // the page adds ?v=<updated time>, so a new upload gets a new URL and old copies can be cached
    headers: { "content-type": "image/webp", "cache-control": "private, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
