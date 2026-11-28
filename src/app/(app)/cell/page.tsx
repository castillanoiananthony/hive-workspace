import type { Metadata } from "next";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { goal, task } from "@/db/schema";
import { computeProgress, forgottenGoals } from "@/lib/progress";
import { lifeData } from "@/lib/life";
import { requireUser } from "@/lib/session";
import { CellBoard } from "./CellBoard";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { BackButton } from "@/components/app/BackButton";

export const metadata: Metadata = { title: "My Cell" };

export default function CellPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/home" />
      <Suspense fallback={<HoneyLoader label="Loading your cell…" />}>
        <Cell />
      </Suspense>
    </main>
  );
}

async function Cell() {
  const me = await requireUser();
  if (!me.onboardedAt) redirect("/onboarding");
  const [goals, tasks, archived] = await Promise.all([
    db.select().from(goal).where(and(eq(goal.ownerId, me.id), isNull(goal.archivedAt))).orderBy(asc(goal.createdAt)),
    db.select({ id: task.id, title: task.title, status: task.status, goalId: task.goalId, dueAt: task.dueAt, hasTime: task.hasTime, importance: task.importance, subjectId: task.subjectId, updatedAt: task.updatedAt })
      .from(task).where(and(eq(task.ownerId, me.id), isNull(task.teamId))).orderBy(asc(task.createdAt)),
    db.select({ id: goal.id, title: goal.title, level: goal.level }).from(goal).where(and(eq(goal.ownerId, me.id), isNotNull(goal.archivedAt))).orderBy(asc(goal.title)),
  ]);
  const progress = computeProgress(goals, tasks);
  const forgotten = forgottenGoals(goals, tasks, progress, new Date());
  return (
    <CellBoard
      tz={me.timezone}
      goals={goals.map((g) => ({ id: g.id, title: g.title, level: g.level, parentId: g.parentId, period: g.period, manualProgress: g.manualProgress, done: g.done, progress: progress.get(g.id) ?? 0 }))}
      tasks={tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, goalId: t.goalId, hasTime: t.hasTime, importance: t.importance, subjectId: t.subjectId, dueAt: t.dueAt?.toISOString() ?? null }))}
      life={await lifeData(me)}
      forgotten={forgotten}
      archived={archived}
    />
  );
}
