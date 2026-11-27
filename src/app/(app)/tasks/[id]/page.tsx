import type { Metadata } from "next";
import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { checklistItem, goal, task, taskLink } from "@/db/schema";
import { utcToZoned } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { TaskEditor } from "./TaskEditor";

export const metadata: Metadata = { title: "Task" };

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<p className="text-muted">Opening task…</p>}>
        <Task params={params} />
      </Suspense>
    </main>
  );
}

async function Task({ params }: { params: PageProps<"/tasks/[id]">["params"] }) {
  const { id } = await params;
  const me = await requireUser();
  const [t] = await db.select().from(task).where(and(eq(task.id, id), eq(task.ownerId, me.id), isNull(task.teamId)));
  if (!t) notFound();
  const [items, links, goals] = await Promise.all([
    db.select().from(checklistItem).where(eq(checklistItem.taskId, id)).orderBy(asc(checklistItem.position)),
    db.select().from(taskLink).where(eq(taskLink.taskId, id)).orderBy(asc(taskLink.position)),
    db.select({ id: goal.id, title: goal.title, level: goal.level }).from(goal).where(and(eq(goal.ownerId, me.id), isNull(goal.archivedAt))).orderBy(asc(goal.createdAt)),
  ]);
  const due = t.dueAt ? utcToZoned(t.dueAt, me.timezone) : null;
  return (
    <TaskEditor
      id={t.id}
      goals={goals}
      initial={{
        title: t.title, notes: t.notes ?? null, status: t.status, goalId: t.goalId,
        dueDate: due?.date ?? null, dueTime: t.hasTime ? due!.time : null,
        checklist: items.map((c) => ({ text: c.text, done: c.done })),
        links: links.map((l) => ({ title: l.title, url: l.url })),
      }}
    />
  );
}
