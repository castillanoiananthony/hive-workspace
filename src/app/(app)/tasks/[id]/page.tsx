import type { Metadata } from "next";
import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { assignment, checklistItem, goal, task, taskLink, team, teamMember } from "@/db/schema";
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
  const [hit] = await db.select({ t: task, team: { id: team.id, name: team.name, color: team.color, ownerId: team.ownerId } }).from(task).leftJoin(team, eq(task.teamId, team.id)).where(eq(task.id, id));
  // personal tasks: only their owner; team tasks: only the team's owner
  if (!hit || (hit.t.teamId ? hit.team?.ownerId !== me.id : hit.t.ownerId !== me.id)) notFound();
  const t = hit.t;
  const teamInfo = t.teamId && hit.team
    ? {
        id: hit.team.id, name: hit.team.name, color: hit.team.color,
        members: await db.select({ id: teamMember.id, name: teamMember.name }).from(teamMember).where(eq(teamMember.teamId, t.teamId)).orderBy(asc(teamMember.name)),
        assigned: await db.select({ memberId: assignment.memberId, doneAt: assignment.doneAt, notifiedAt: assignment.notifiedAt }).from(assignment).where(eq(assignment.taskId, t.id)),
      }
    : null;
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
      team={teamInfo && { id: teamInfo.id, name: teamInfo.name, color: teamInfo.color, members: teamInfo.members, done: teamInfo.assigned.filter((a) => a.doneAt).map((a) => a.memberId), notified: teamInfo.assigned.filter((a) => a.notifiedAt).map((a) => a.memberId) }}
      initial={{
        title: t.title, notes: t.notes ?? null, status: t.status, goalId: t.goalId,
        dueDate: due?.date ?? null, dueTime: t.hasTime ? due!.time : null,
        checklist: items.map((c) => ({ text: c.text, done: c.done })),
        links: links.map((l) => ({ title: l.title, url: l.url })),
        ...(teamInfo ? { howTo: t.howTo ?? null, assignees: teamInfo.assigned.map((a) => a.memberId) } : {}),
      }}
    />
  );
}
