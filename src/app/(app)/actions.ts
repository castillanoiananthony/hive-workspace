"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { goal, task, team, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { PRESETS, TEXT_SIZES, type Mode, type PresetId, type TextSize, type ThemeSettings } from "@/lib/themes";
import { headers } from "next/headers";

const clean = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

export async function createFirstGoal(title: string) {
  const me = await requireUser();
  const t = clean(title);
  if (!t) throw new Error("Give your goal a name.");
  const [row] = await db.insert(goal).values({ ownerId: me.id, title: t, level: "year", period: String(new Date().getFullYear()) }).returning({ id: goal.id });
  return row.id;
}

export async function createFirstTask(title: string, goalId: string | null) {
  const me = await requireUser();
  const t = clean(title);
  if (!t) throw new Error("Give your task a name.");
  // only link to a goal the user owns
  const parent = goalId ? (await db.select({ id: goal.id }).from(goal).where(and(eq(goal.id, goalId), eq(goal.ownerId, me.id))))[0] : undefined;
  await db.insert(task).values({ ownerId: me.id, title: t, goalId: parent?.id ?? null });
}

export async function createFirstTeam(name: string) {
  const me = await requireUser();
  const n = clean(name, 80);
  if (!n) throw new Error("Give your team a name.");
  await db.insert(team).values({ ownerId: me.id, name: n, color: "#F5B80B" });
}

export async function finishOnboarding() {
  const me = await requireUser();
  await db.update(user).set({ onboardedAt: new Date() }).where(eq(user.id, me.id));
  redirect("/home");
}

export async function saveTheme(settings: ThemeSettings) {
  const me = await requireUser();
  const preset = (settings.preset in PRESETS ? settings.preset : "honey") as PresetId;
  const mode = (["dark", "light", "system"].includes(settings.mode) ? settings.mode : "dark") as Mode;
  const accent = settings.accent && /^#[0-9a-f]{6}$/i.test(settings.accent) ? settings.accent : null;
  const textSize = (settings.textSize && settings.textSize in TEXT_SIZES ? settings.textSize : "m") as TextSize;
  await db.update(user).set({ theme: { preset, mode, accent: accent as ThemeSettings["accent"], textSize } }).where(eq(user.id, me.id));
  revalidatePath("/settings");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

/** The name teammates see in Buzz emails ("Ian assigned you a task"). */
export async function updateName(name: string) {
  const me = await requireUser();
  const n = clean(name, 80);
  if (!n) throw new Error("Type the name your teammates know you by.");
  await db.update(user).set({ name: n }).where(eq(user.id, me.id));
  revalidatePath("/settings");
}
