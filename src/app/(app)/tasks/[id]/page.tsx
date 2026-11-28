import type { Metadata } from "next";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { assignment, checklistItem, goal, subject, subtask, task, taskComment, taskLink, team, teamMember, teamStream, testRun } from "@/db/schema";
import { formatDue, utcToZoned } from "@/lib/dates";
import { docToHtml } from "@/lib/doc-to-html";
import { can, canComment } from "@/lib/hive-perms";
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
  const [hit] = await db.select({ t: task, team: { id: team.id, name: team.name, color: team.color, importanceColors: team.importanceColors, taskTypes: team.taskTypes } }).from(task).leftJoin(team, eq(task.teamId, team.id)).where(eq(task.id, id));
  if (!hit) notFound();
  const t = hit.t;
  // personal tasks: only their owner. Team tasks: members can read; people with "Create & assign tasks" can edit.
  const access = t.teamId ? await teamAccess(me.id, t.teamId).catch(() => null) : null;
  if (t.teamId ? !access : t.ownerId !== me.id) notFound();
  // team tasks: subtasks and comments, shown to editors and members alike
  const extras = access ? await loadExtras(t.id, t.teamId!, access.me, me.timezone) : null;
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
        assigned={mine.length > 0} done={Boolean(mine[0]?.doneAt)} status={t.status} canApprove={can(access.me, "approve")}
        ownsSubtask={extras!.subtasks.some((x) => x.ownerId === access.me.id)} extras={extras!}
        dev={{ customTypes: hit.team?.taskTypes ?? [], type: t.type, severity: t.severity, steps: t.steps, decision: t.decision, rationale: t.rationale, run: t.testRunId ? (await db.select({ at: testRun.ranAt, version: testRun.version, result: testRun.result }).from(testRun).where(eq(testRun.id, t.testRunId)))[0] ?? null : null }}
      />
    );
  }
  const teamInfo = t.teamId && hit.team
    ? {
        id: hit.team.id, name: hit.team.name, color: hit.team.color, importanceColors: hit.team.importanceColors, taskTypes: hit.team.taskTypes ?? [],
        members: await db.select({ id: teamMember.id, name: sql<string>`coalesce(nullif(${teamMember.nickname}, ''), ${teamMember.name})`, access: teamMember.access }).from(teamMember).where(eq(teamMember.teamId, t.teamId)).orderBy(asc(teamMember.name)),
        assigned: await db.select({ memberId: assignment.memberId, doneAt: assignment.doneAt, notifiedAt: assignment.notifiedAt }).from(assignment).where(eq(assignment.taskId, t.id)),
      }
    : null;
  const runs = t.teamId ? await db.select({ id: testRun.id, at: testRun.ranAt, version: testRun.version, result: testRun.result }).from(testRun).where(eq(testRun.teamId, t.teamId)).orderBy(desc(testRun.ranAt)).limit(50) : [];
  const streamOptions = t.teamId ? await db.select({ id: teamStream.id, name: teamStream.name }).from(teamStream).where(eq(teamStream.teamId, t.teamId)).orderBy(asc(teamStream.position)) : [];
  const runOptions = runs.map((r) => ({ id: r.id, label: `${formatDue(r.at, true, me.timezone)}${r.version ? `, ${r.version.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}` : ""}${r.result ? `, ${r.result}` : ""}` }));
  const [items, links, goals, subjects] = await Promise.all([
    db.select().from(checklistItem).where(eq(checklistItem.taskId, id)).orderBy(asc(checklistItem.position)),
    db.select().from(taskLink).where(eq(taskLink.taskId, id)).orderBy(asc(taskLink.position)),
    db.select({ id: goal.id, title: goal.title, level: goal.level }).from(goal).where(and(eq(goal.ownerId, me.id), isNull(goal.archivedAt))).orderBy(asc(goal.createdAt)),
    t.teamId ? Promise.resolve([]) : db.select({ id: subject.id, code: subject.code, color: subject.color }).from(subject).where(eq(subject.ownerId, me.id)).orderBy(asc(subject.position)),
  ]);
  const due = t.dueAt ? utcToZoned(t.dueAt, me.timezone) : null;
  return (
    <TaskEditor
      id={t.id}
      goals={goals}
      extras={extras}
      subjects={subjects}
      runs={runOptions}
      streams={streamOptions}
      team={teamInfo && { id: teamInfo.id, name: teamInfo.name, color: teamInfo.color, importanceColors: teamInfo.importanceColors ?? null, taskTypes: teamInfo.taskTypes, canApprove: access ? can(access.me, "approve") : false, members: teamInfo.members.filter((m) => m.access === "member" || teamInfo.assigned.some((x) => x.memberId === m.id)).map(({ id, name }) => ({ id, name })), done: teamInfo.assigned.filter((a) => a.doneAt).map((a) => a.memberId), notified: teamInfo.assigned.filter((a) => a.notifiedAt).map((a) => a.memberId) }}
      initial={{
        title: t.title, notes: t.notes ?? null, status: t.status, importance: t.importance, subjectId: t.subjectId, isExam: t.isExam, goalId: t.goalId,
        dueDate: due?.date ?? null, dueTime: t.hasTime ? due!.time : null,
        checklist: items.map((c) => ({ text: c.text, done: c.done })),
        links: links.map((l) => ({ title: l.title, url: l.url })),
        ...(teamInfo ? { howTo: t.howTo ?? null, assignees: teamInfo.assigned.map((a) => a.memberId), type: t.type, severity: t.severity, steps: t.steps, testRunId: t.testRunId, decision: t.decision, rationale: t.rationale, streamId: t.streamId } : {}),
      }}
    />
  );
}

async function loadExtras(taskId: string, teamId: string, mine: typeof teamMember.$inferSelect, tz: string) {
  const [members, subs, comments] = await Promise.all([
    db.select({ id: teamMember.id, name: sql<string>`coalesce(nullif(${teamMember.nickname}, ''), ${teamMember.name})`, access: teamMember.access }).from(teamMember).where(eq(teamMember.teamId, teamId)).orderBy(asc(teamMember.name)),
    db.select().from(subtask).where(eq(subtask.taskId, taskId)).orderBy(asc(subtask.position), asc(subtask.createdAt)),
    db.select().from(taskComment).where(eq(taskComment.taskId, taskId)).orderBy(asc(taskComment.createdAt)),
  ]);
  const now = Date.now();
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Former member";
  const fmt = (d: Date) => new Intl.DateTimeFormat("en", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  return {
    taskId,
    members,
    me: { memberId: mine.id, canEdit: can(mine, "tasks"), canComment: canComment(mine), isAdmin: mine.isAdmin },
    subtasks: subs.map((x) => {
      const z = x.dueAt ? utcToZoned(x.dueAt, tz) : null;
      return { id: x.id, title: x.title, ownerId: x.ownerId, date: z?.date ?? null, time: x.hasTime ? z!.time : null, dueLabel: x.dueAt ? formatDue(x.dueAt, x.hasTime, tz) : null, overdue: Boolean(x.dueAt && x.dueAt.getTime() < now), done: Boolean(x.doneAt) };
    }),
    comments: comments.map((c) => ({ id: c.id, memberId: c.memberId, name: nameOf(c.memberId), body: c.body, at: c.createdAt.toISOString(), atLabel: fmt(c.createdAt) })),
  };
}
