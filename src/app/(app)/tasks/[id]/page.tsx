import type { Metadata } from "next";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { assignment, checklistItem, goal, task, taskLink, team, teamMember } from "@/db/schema";
import { formatDue, utcToZoned } from "@/lib/dates";
import { docToHtml } from "@/lib/doc-to-html";
import { can } from "@/lib/hive-perms";
import { teamAccess } from "@/lib/teams";
import { requireUser } from "@/lib/session";
import { TaskEditor } from "./TaskEditor";
import { TeamTaskView } from "./TeamTaskView";
import { HoneyLoader } from "@/components/app/HoneyLoader";

export const metadata: Metadata = { title: "Task" };

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<HoneyLoader label="Opening task…" />}>
        <Task params={params} />
      </Suspense>
    </main>
  );
}

async function Task({ params }: { params: PageProps<"/tasks/[id]">["params"] }) {
  const { id } = await params;
  const me = await requireUser();
  const [hit] = await db.select({ t: task, team: { id: team.id, name: team.name, color: team.color } }).from(task).leftJoin(team, eq(task.teamId, team.id)).where(eq(task.id, id));
  if (!hit) notFound();
  const t = hit.t;
  // personal tasks: only their owner. Team tasks: members can read; people with "Create & assign tasks" can edit.
  const access = t.teamId ? await teamAccess(me.id, t.teamId).catch(() => null) : null;
  if (t.teamId ? !access : t.ownerId !== me.id) notFound();
  if (access && !can(access.me, "tasks")) {
    const [items, links, mine] = await Promise.all([
      db.select().from(checklistItem).where(eq(checklistItem.taskId, id)).orderBy(asc(checklistItem.position)),
      db.select().from(taskLink).where(eq(taskLink.taskId, id)).orderBy(asc(taskLink.position)),
      db.select({ doneAt: assignment.doneAt }).from(assignment).where(and(eq(assignment.taskId, id), eq(assignment.memberId, access.me.id))),
    ]);
    return (
      <TeamTaskView
        id={t.id} team={{ id: access.team.id, name: access.team.name }} title={t.title} howToHtml={docToHtml(t.howTo)}
        due={t.dueAt ? formatDue(t.dueAt, t.hasTime, me.timezone) : null} checklist={items.map((c) => c.text)} links={links.map((l) => ({ title: l.title, url: l.url }))}
        assigned={mine.length > 0} done={Boolean(mine[0]?.doneAt)}
      />
    );
  }
  const teamInfo = t.teamId && hit.team
    ? {
        id: hit.team.id, name: hit.team.name, color: hit.team.color,
        members: await db.select({ id: teamMember.id, name: sql<string>`coalesce(nullif(${teamMember.nickname}, ''), ${teamMember.name})` }).from(teamMember).where(eq(teamMember.teamId, t.teamId)).orderBy(asc(teamMember.name)),
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
