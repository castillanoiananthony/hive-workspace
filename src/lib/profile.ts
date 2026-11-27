import "server-only";
import { eq } from "drizzle-orm";
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
