import type { Metadata } from "next";
import { and, asc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { goal, task } from "@/db/schema";
import { computeProgress } from "@/lib/progress";
import { requireUser } from "@/lib/session";
import { CellBoard } from "./CellBoard";

export const metadata: Metadata = { title: "My Cell" };

export default function CellPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<p className="text-muted">Loading your cell…</p>}>
        <Cell />
      </Suspense>
    </main>
  );
}

async function Cell() {
  const me = await requireUser();
  if (!me.onboardedAt) redirect("/onboarding");
  const [goals, tasks] = await Promise.all([
    db.select().from(goal).where(and(eq(goal.ownerId, me.id), isNull(goal.archivedAt))).orderBy(asc(goal.createdAt)),
    db.select({ id: task.id, title: task.title, status: task.status, goalId: task.goalId, dueAt: task.dueAt, hasTime: task.hasTime })
      .from(task).where(and(eq(task.ownerId, me.id), isNull(task.teamId))).orderBy(asc(task.createdAt)),
  ]);
  const progress = computeProgress(goals, tasks);
  return (
    <CellBoard
      tz={me.timezone}
      goals={goals.map((g) => ({ id: g.id, title: g.title, level: g.level, parentId: g.parentId, period: g.period, manualProgress: g.manualProgress, done: g.done, progress: progress.get(g.id) ?? 0 }))}
      tasks={tasks.map((t) => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null }))}
    />
  );
}
