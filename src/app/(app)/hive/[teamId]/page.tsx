import type { Metadata } from "next";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { assignment, emailLog, task, team, teamMember, template } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { TeamView } from "./TeamView";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage({ params }: PageProps<"/hive/[teamId]">) {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<p className="text-muted">Loading team…</p>}>
        <Team params={params} />
      </Suspense>
    </main>
  );
}

async function Team({ params }: { params: PageProps<"/hive/[teamId]">["params"] }) {
  const { teamId } = await params;
  const me = await requireUser();
  const [t] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.ownerId, me.id)));
  if (!t) notFound();
  const [members, tasks, templates, log] = await Promise.all([
    db.select({ id: teamMember.id, name: teamMember.name, email: teamMember.email, unsubscribed: teamMember.unsubscribedAt }).from(teamMember).where(eq(teamMember.teamId, teamId)).orderBy(asc(teamMember.name)),
    db.select({ id: task.id, title: task.title, status: task.status, dueAt: task.dueAt, hasTime: task.hasTime }).from(task).where(eq(task.teamId, teamId)).orderBy(asc(task.dueAt), asc(task.createdAt)),
    db.select().from(template).where(eq(template.teamId, teamId)).orderBy(asc(template.createdAt)),
    db.select({ id: emailLog.id, kind: emailLog.kind, recipient: emailLog.recipient, status: emailLog.status, error: emailLog.error, at: emailLog.createdAt, sentAt: emailLog.sentAt, name: teamMember.name, task: task.title })
      .from(emailLog).leftJoin(teamMember, eq(emailLog.memberId, teamMember.id)).leftJoin(task, eq(emailLog.taskId, task.id))
      .where(eq(emailLog.teamId, teamId)).orderBy(desc(emailLog.createdAt)).limit(100),
  ]);
  const assigned = tasks.length
    ? await db.select({ taskId: assignment.taskId, memberId: assignment.memberId, doneAt: assignment.doneAt }).from(assignment).where(inArray(assignment.taskId, tasks.map((x) => x.id)))
    : [];
  return (
    <TeamView
      tz={me.timezone}
      team={{ id: t.id, name: t.name, color: t.color, digestEnabled: t.digestEnabled, digestDay: t.digestDay }}
      members={members.map((m) => ({ ...m, unsubscribed: Boolean(m.unsubscribed) }))}
      tasks={tasks.map((x) => ({ ...x, dueAt: x.dueAt?.toISOString() ?? null }))}
      assigned={assigned.map((a) => ({ ...a, doneAt: a.doneAt?.toISOString() ?? null }))}
      log={log.map((l) => ({ ...l, at: (l.sentAt ?? l.at).toISOString(), sentAt: undefined }))}
      templates={templates.map((tp) => ({ id: tp.id, title: tp.title, recurrence: tp.recurrence, weekday: tp.weekday, monthDay: tp.monthDay, dueTime: tp.dueTime, assignAll: tp.assignAll, memberIds: tp.memberIds, checklist: tp.content.checklist.length, links: tp.content.links.length }))}
    />
  );
}
