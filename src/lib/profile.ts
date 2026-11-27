import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { userImage } from "@/db/schema";

/** Image URLs for a user (null when not uploaded), versioned so a new upload shows immediately. */
export async function profileImages(userId: string) {
  const rows = await db.select({ kind: userImage.kind, updatedAt: userImage.updatedAt }).from(userImage).where(eq(userImage.userId, userId));
  const url = (k: "avatar" | "banner") => {
    const r = rows.find((x) => x.kind === k);
    return r ? `/api/profile-image/${userId}/${k}?v=${r.updatedAt.getTime()}` : null;
  };
  return { avatar: url("avatar"), banner: url("banner") };
}

/** Avatar URLs for many users at once (missing = no picture). */
export async function avatarsFor(userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const rows = await db.select({ userId: userImage.userId, updatedAt: userImage.updatedAt }).from(userImage)
    .where(and(eq(userImage.kind, "avatar"), inArray(userImage.userId, userIds)));
  return new Map(rows.map((r) => [r.userId, `/api/profile-image/${r.userId}/avatar?v=${r.updatedAt.getTime()}`]));
}
