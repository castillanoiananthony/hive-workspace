"use server";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { testField, testRun } from "@/db/schema";
import { can } from "@/lib/hive-perms";
import { requireUser } from "@/lib/session";
import { requirePerm, teamAccess } from "@/lib/teams";

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
const refresh = (teamId: string) => { revalidatePath(`/hive/${teamId}`); revalidatePath(`/hive/${teamId}/summary`); };

export async function addTestField(teamId: string, input: { name: string; unit?: string; higherIsBetter?: boolean }) {
  const me = await requireUser();
  await requirePerm(me.id, teamId, "tasks");
  const name = clean(input.name, 40);
  if (!name) throw new Error("Name the field, e.g. Score or Time.");
  const n = await db.select({ id: testField.id }).from(testField).where(eq(testField.teamId, teamId));
  if (n.length >= 8) throw new Error("A hive can track up to 8 numbers.");
  await db.insert(testField).values({ teamId, name, unit: clean(input.unit, 12) || null, higherIsBetter: input.higherIsBetter !== false, position: n.length });
  refresh(teamId);
}

export async function deleteTestField(id: string) {
  const me = await requireUser();
  const [f] = await db.select().from(testField).where(eq(testField.id, id));
  if (!f) return;
  await requirePerm(me.id, f.teamId, "tasks");
  await db.delete(testField).where(eq(testField.id, id)); // old runs keep their numbers in their JSON, just unlabelled
  refresh(f.teamId);
}

/** Any full member logs a run: version or commit link, pass/fail, the hive's numbers, notes. */
export async function logTestRun(teamId: string, input: { version?: string; result?: string; notes?: string; values?: Record<string, unknown>; ranAt?: string }) {
  const me = await requireUser();
  const { me: m, team: t } = await teamAccess(me.id, teamId);
  if (t.archivedAt) throw new Error("This hive is archived, so it's read-only.");
  if (m.access !== "member") throw new Error("Advisers and guests can read the test log but not add to it.");
  const fields = await db.select({ id: testField.id }).from(testField).where(eq(testField.teamId, teamId));
  const values: Record<string, number> = {};
  for (const f of fields) { const v = Number(String(input.values?.[f.id] ?? "").replace(",", ".")); if (String(input.values?.[f.id] ?? "").trim() !== "" && Number.isFinite(v)) values[f.id] = v; }
  const result = input.result === "pass" || input.result === "fail" ? input.result : null;
  const version = clean(input.version, 300) || null, notes = clean(input.notes, 1000) || null;
  if (!result && !Object.keys(values).length && !notes) throw new Error("Add a result, a number or a note.");
  const ranAt = input.ranAt && !Number.isNaN(Date.parse(input.ranAt)) && Date.parse(input.ranAt) <= Date.now() + 60_000 ? new Date(input.ranAt) : new Date();
  await db.insert(testRun).values({ teamId, memberId: m.id, version, result, notes, values, ranAt });
  refresh(teamId);
}

export async function deleteTestRun(id: string) {
  const me = await requireUser();
  const [r] = await db.select().from(testRun).where(eq(testRun.id, id));
  if (!r) return;
  const { me: m, team: t } = await teamAccess(me.id, r.teamId);
  if (t.archivedAt) throw new Error("This hive is archived, so it's read-only.");
  if (r.memberId !== m.id && !can(m, "tasks")) throw new Error("You can only delete your own runs.");
  await db.delete(testRun).where(eq(testRun.id, id));
  refresh(r.teamId);
}

/** Pins one run as the hive's best version (only one at a time). */
export async function setBestRun(id: string, best: boolean) {
  const me = await requireUser();
  const [r] = await db.select().from(testRun).where(eq(testRun.id, id));
  if (!r) throw new Error("That run no longer exists.");
  await requirePerm(me.id, r.teamId, "tasks");
  if (best) await db.update(testRun).set({ isBest: false }).where(and(eq(testRun.teamId, r.teamId), ne(testRun.id, id)));
  await db.update(testRun).set({ isBest: best }).where(eq(testRun.id, id));
  refresh(r.teamId);
}
