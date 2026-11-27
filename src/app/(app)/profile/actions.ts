"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user, userImage } from "@/db/schema";
import { processImage } from "@/lib/images";
import { requireUser } from "@/lib/session";

const refresh = () => { revalidatePath("/profile"); revalidatePath("/", "layout"); };

export async function updateProfile(input: { name: string; bio: string }) {
  const me = await requireUser();
  const name = String(input.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Your name can't be empty.");
  const bio = String(input.bio ?? "").trim().slice(0, 300);
  await db.update(user).set({ name, bio: bio || null }).where(eq(user.id, me.id));
  refresh();
}

export async function uploadProfileImage(form: FormData) {
  const me = await requireUser();
  const kind = form.get("kind") === "banner" ? "banner" : "avatar";
  const data = await processImage(form.get("file") as File, kind);
  await db.insert(userImage).values({ userId: me.id, kind, data })
    .onConflictDoUpdate({ target: [userImage.userId, userImage.kind], set: { data, updatedAt: new Date() } });
  refresh();
}

export async function removeProfileImage(kind: "avatar" | "banner") {
  const me = await requireUser();
  await db.delete(userImage).where(and(eq(userImage.userId, me.id), eq(userImage.kind, kind === "banner" ? "banner" : "avatar")));
  refresh();
}
