"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { follow, user } from "@/db/schema";
import { requireUser } from "@/lib/session";

export async function setFollowing(userId: string, on: boolean) {
  const me = await requireUser();
  if (typeof userId !== "string" || userId === me.id) throw new Error("You can't follow yourself.");
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!target) throw new Error("That account no longer exists.");
  if (on) await db.insert(follow).values({ followerId: me.id, followingId: userId }).onConflictDoNothing();
  else await db.delete(follow).where(and(eq(follow.followerId, me.id), eq(follow.followingId, userId)));
  revalidatePath(`/u/${userId}`); revalidatePath("/people"); revalidatePath("/profile");
}
