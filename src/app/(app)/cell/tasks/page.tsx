import type { Metadata } from "next";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { goal, task } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { TaskList } from "./TaskList";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { BackButton } from "@/components/app/BackButton";

export const metadata: Metadata = { title: "All tasks" };

export default function TasksPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/cell" />
      <Suspense fallback={<HoneyLoader label="Loading tasks…" />}>
        <Tasks />
      </Suspense>
    </main>
  );
}

async function Tasks() {
  const me = await requireUser();
  const [tasks, goals] = await Promise.all([
    db.select({ id: task.id, title: task.title, status: task.status, goalId: task.goalId, dueAt: task.dueAt, hasTime: task.hasTime, updatedAt: task.updatedAt })
      .from(task).where(and(eq(task.ownerId, me.id), isNull(task.teamId))).orderBy(desc(task.updatedAt)),
    db.select({ id: goal.id, title: goal.title }).from(goal).where(and(eq(goal.ownerId, me.id), isNull(goal.archivedAt))).orderBy(asc(goal.createdAt)),
  ]);
  return <TaskList tz={me.timezone} goals={goals} tasks={tasks.map((t) => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null, updatedAt: t.updatedAt.toISOString() }))} />;
}
