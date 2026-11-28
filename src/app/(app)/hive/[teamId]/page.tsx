import type { Metadata } from "next";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { assignment, colony, combPost, contribution, criterion, hiveMilestone, meetingNote, taskCriterion, teamStream, testField, testRun, milestone, teamChecklist, teamChecklistItem, progressLog, subtask, taskLink, emailLog, task, teamLink, teamMember, teamRole, template, userImage } from "@/db/schema";
import { ALL_PERMS, can } from "@/lib/hive-perms";
import { requireUser } from "@/lib/session";
import { lastDays } from "@/lib/activity";
import { formatDue, isRecent } from "@/lib/dates";
import { importanceOf } from "@/lib/importance";
import { utcToZoned } from "@/lib/dates";
import { ensureRoles, teamAccess } from "@/lib/teams";
import { TeamView } from "./TeamView";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage({ params }: PageProps<"/hive/[teamId]">) {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/hive" />
      <Suspense fallback={<HoneyLoader label="Loading team…" />}>
        <Team params={params} />
      </Suspense>
    </main>
  );
}

async function Team({ params }: { params: PageProps<"/hive/[teamId]">["params"] }) {
  const { teamId } = await params;
  const me = await requireUser();
  const access = await teamAccess(me.id, teamId).catch(() => null);
  if (!access) notFound();
  await ensureRoles(teamId);
  const { team: t, me: mine } = access;
  const [members, roles, tasks, templates, log, posts, links] = await Promise.all([
    db.select().from(teamMember).where(eq(teamMember.teamId, teamId)).orderBy(asc(teamMember.position), asc(teamMember.createdAt)),
    db.select().from(teamRole).where(eq(teamRole.teamId, teamId)).orderBy(asc(teamRole.position), asc(teamRole.createdAt)),
    db.select({ id: task.id, title: task.title, status: task.status, dueAt: task.dueAt, hasTime: task.hasTime, importance: task.importance, type: task.type, streamId: task.streamId, createdAt: task.createdAt }).from(task).where(eq(task.teamId, teamId)).orderBy(asc(task.dueAt), asc(task.createdAt)),
    can(mine, "templates") ? db.select().from(template).where(eq(template.teamId, teamId)).orderBy(asc(template.createdAt)) : Promise.resolve([]),
    can(mine, "log")
      ? db.select({ id: emailLog.id, kind: emailLog.kind, recipient: emailLog.recipient, status: emailLog.status, error: emailLog.error, at: emailLog.createdAt, sentAt: emailLog.sentAt, name: teamMember.name, task: task.title })
          .from(emailLog).leftJoin(teamMember, eq(emailLog.memberId, teamMember.id)).leftJoin(task, eq(emailLog.taskId, task.id))
          .where(eq(emailLog.teamId, teamId)).orderBy(desc(emailLog.createdAt)).limit(100)
      : Promise.resolve([]),
    db.select().from(combPost).where(and(eq(combPost.teamId, teamId), can(mine, "hide") ? undefined : isNull(combPost.hiddenAt))).orderBy(desc(combPost.createdAt)).limit(50),
    db.select().from(teamLink).where(eq(teamLink.teamId, teamId)).orderBy(desc(teamLink.createdAt)),
  ]);
  const taskIds = tasks.map((x) => x.id);
  const userIds = members.map((m) => m.userId).filter((x): x is string => Boolean(x));
  const [assigned, avatars] = await Promise.all([
    taskIds.length ? db.select({ taskId: assignment.taskId, memberId: assignment.memberId, doneAt: assignment.doneAt, progress: assignment.progress }).from(assignment).where(inArray(assignment.taskId, taskIds)) : Promise.resolve([]),
    userIds.length ? db.select({ userId: userImage.userId, updatedAt: userImage.updatedAt }).from(userImage).where(and(eq(userImage.kind, "avatar"), inArray(userImage.userId, userIds))) : Promise.resolve([]),
  ]);
  const avatarOf = (userId: string | null) => { const a = avatars.find((x) => x.userId === userId); return a ? `/api/profile-image/${userId}/avatar?v=${a.updatedAt.getTime()}` : null; };

  const [subCounts, linkCounts, contributions, [mySubs]] = await Promise.all([
    taskIds.length ? db.select({ taskId: subtask.taskId, total: count(), done: sql<number>`count(${subtask.doneAt})::int` }).from(subtask).where(inArray(subtask.taskId, taskIds)).groupBy(subtask.taskId) : Promise.resolve([]),
    taskIds.length ? db.select({ taskId: taskLink.taskId, n: count() }).from(taskLink).where(inArray(taskLink.taskId, taskIds)).groupBy(taskLink.taskId) : Promise.resolve([]),
    db.select().from(contribution).where(eq(contribution.teamId, teamId)).orderBy(desc(contribution.createdAt)).limit(500),
    taskIds.length ? db.select({ n: count() }).from(subtask).where(and(inArray(subtask.taskId, taskIds), eq(subtask.ownerId, mine.id))) : Promise.resolve([{ n: 0 }]),
  ]);
  const logs = await db.select({ id: progressLog.id, taskId: assignment.taskId, memberId: assignment.memberId, progress: progressLog.progress, done: progressLog.done, note: progressLog.note, at: progressLog.createdAt })
    .from(progressLog).innerJoin(assignment, eq(progressLog.assignmentId, assignment.id))
    .where(eq(progressLog.teamId, teamId)).orderBy(desc(progressLog.createdAt)).limit(300);
  const classInfo = t.colonyId ? await Promise.all([
    db.select({ id: colony.id, name: colony.name }).from(colony).where(eq(colony.id, t.colonyId)),
    db.select().from(milestone).where(eq(milestone.colonyId, t.colonyId)).orderBy(asc(milestone.dueAt)),
  ]) : null;
  const milestones = classInfo ? classInfo[1].map((m) => { const z = utcToZoned(m.dueAt, me.timezone); return { id: m.id, title: m.title, date: z.date, label: new Intl.DateTimeFormat("en", { timeZone: me.timezone, month: "short", day: "numeric" }).format(m.dueAt) }; }) : [];
  const [streams, notes, crit, critLinks] = await Promise.all([
    db.select().from(teamStream).where(eq(teamStream.teamId, teamId)).orderBy(asc(teamStream.position)),
    db.select().from(meetingNote).where(eq(meetingNote.teamId, teamId)).orderBy(desc(meetingNote.createdAt)).limit(30),
    db.select().from(criterion).where(eq(criterion.teamId, teamId)).orderBy(asc(criterion.position)),
    db.select({ taskId: taskCriterion.taskId, criterionId: taskCriterion.criterionId }).from(taskCriterion).innerJoin(criterion, eq(taskCriterion.criterionId, criterion.id)).where(eq(criterion.teamId, teamId)),
  ]);
  const [tFields, tRuns] = await Promise.all([
    db.select().from(testField).where(eq(testField.teamId, teamId)).orderBy(asc(testField.position)),
    db.select().from(testRun).where(eq(testRun.teamId, teamId)).orderBy(desc(testRun.ranAt)).limit(300),
  ]);
  const [hms, cls, items] = await Promise.all([
    db.select().from(hiveMilestone).where(eq(hiveMilestone.teamId, teamId)).orderBy(asc(hiveMilestone.dueAt), asc(hiveMilestone.position)),
    db.select().from(teamChecklist).where(eq(teamChecklist.teamId, teamId)).orderBy(asc(teamChecklist.position)),
    db.select({ i: teamChecklistItem }).from(teamChecklistItem).innerJoin(teamChecklist, eq(teamChecklistItem.checklistId, teamChecklist.id)).where(eq(teamChecklist.teamId, teamId)).orderBy(asc(teamChecklistItem.position)),
  ]);
  const hiveMilestones = hms.map((m) => { const z = m.dueAt ? utcToZoned(m.dueAt, me.timezone) : null; return { id: m.id, title: m.title, dueAt: m.dueAt?.toISOString() ?? null, hasTime: m.hasTime, done: Boolean(m.doneAt), date: z?.date ?? null, time: m.hasTime ? z!.time : null, label: m.dueAt ? formatDue(m.dueAt, m.hasTime, me.timezone) : null }; });
  const checklists = cls.map((c) => ({ id: c.id, title: c.title, items: items.filter((x) => x.i.checklistId === c.id).map(({ i }) => ({ id: i.id, text: i.text, ownerId: i.ownerId, done: Boolean(i.doneAt), doneBy: i.doneById })) }));
  const days = lastDays(me.timezone, { done: assigned.map((a) => a.doneAt), created: tasks.map((x) => x.createdAt), posts: posts.map((p) => p.createdAt), logs: logs.map((l) => l.at) });

  return (
    <TeamView
      days={days}
      hiveMilestones={hiveMilestones}
      streams={streams.map((x) => ({ id: x.id, name: x.name, color: x.color }))}
      notes={notes.map((n) => ({ id: n.id, memberId: n.memberId, body: n.body, at: n.createdAt.toISOString(), label: formatDue(n.createdAt, true, me.timezone), taskIds: n.taskIds }))}
      criteria={crit.map((c) => ({ id: c.id, text: c.text, taskIds: critLinks.filter((l) => l.criterionId === c.id).map((l) => l.taskId) }))}
      testFields={tFields.map((f) => ({ id: f.id, name: f.name, unit: f.unit, higherIsBetter: f.higherIsBetter }))}
      testRuns={tRuns.map((r) => ({ id: r.id, memberId: r.memberId, at: r.ranAt.toISOString(), label: formatDue(r.ranAt, true, me.timezone), version: r.version, result: r.result, notes: r.notes, values: r.values, isBest: r.isBest }))}
      checklists={checklists}
      contributions={contributions.map((c) => ({ id: c.id, memberId: c.memberId, kind: c.kind, what: c.what, at: c.createdAt.toISOString() }))}
      logs={logs.map((l) => ({ ...l, at: l.at.toISOString() }))}
      colonyInfo={classInfo?.[0][0] ? { id: classInfo[0][0].id, name: classInfo[0][0].name, milestones } : null}
      calendar={[...milestones.map((m) => ({ id: `ms-${m.id}`, title: `Milestone: ${m.title}`, done: false, date: m.date, time: null, space: t.id, spaceName: t.name, color: "#8B5CF6", tint: "#8B5CF6" })), ...tasks.filter((x) => x.dueAt).map((x) => { const z = utcToZoned(x.dueAt!, me.timezone); return { id: x.id, title: x.title || "Untitled task", done: x.status === "done", date: z.date, time: x.hasTime ? z.time : null, space: t.id, spaceName: t.name, color: t.color, tint: importanceOf(x.importance, t.importanceColors)?.color ?? null }; })]}
      tz={me.timezone}
      me={{ memberId: mine.id, isAdmin: mine.isAdmin, perms: mine.isAdmin ? ALL_PERMS : mine.perms, access: mine.access, subtasks: Number(mySubs?.n ?? 0) }}
      team={{ id: t.id, name: t.name, color: t.color, digestEnabled: t.digestEnabled, digestDay: t.digestDay, joinCode: can(mine, "members") ? t.joinCode : null, importanceColors: t.importanceColors ?? null, kind: t.kind, archived: t.archivedAt ? formatDue(t.archivedAt, false, me.timezone) : null, app: process.env.APP_URL ?? "http://localhost:3000" }}
      members={members.map((m) => ({
        id: m.id, userId: m.userId, name: m.name, nickname: m.nickname, email: can(mine, "members") || m.id === mine.id ? m.email : null,
        joined: Boolean(m.userId), isAdmin: m.isAdmin, roleId: m.roleId, perms: m.isAdmin ? ALL_PERMS : m.perms, parentId: m.parentId, position: m.position,
        avatar: avatarOf(m.userId), unsubscribed: Boolean(m.unsubscribedAt), access: m.access, streams: m.streams,
        working: m.workingAt && isRecent(m.workingAt) ? m.workingAt.toISOString() : null, workingNote: m.workingNote,
      }))}
      links={links.map((l) => ({ id: l.id, title: l.title, url: l.url, note: l.note, memberId: l.memberId, at: l.createdAt.toISOString(), pinned: l.pinned, category: l.category }))}
      roles={roles.map((r) => ({ id: r.id, name: r.name, perms: r.perms, isLeader: r.isLeader }))}
      tasks={tasks.map((x) => ({ id: x.id, title: x.title, status: x.status, dueAt: x.dueAt?.toISOString() ?? null, hasTime: x.hasTime, importance: x.importance, type: x.type, streamId: x.streamId, subtasks: { total: Number(subCounts.find((c) => c.taskId === x.id)?.total ?? 0), done: Number(subCounts.find((c) => c.taskId === x.id)?.done ?? 0) }, links: Number(linkCounts.find((c) => c.taskId === x.id)?.n ?? 0) }))}
      assigned={assigned.map((a) => ({ ...a, doneAt: a.doneAt?.toISOString() ?? null }))}
      stream={[
        ...posts.map((p) => ({ kind: "post" as const, id: p.id, at: p.createdAt.toISOString(), memberId: p.memberId, body: p.body, hidden: Boolean(p.hiddenAt) })),
      ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60)} // posts only: task progress is in the Activity tab
      log={log.map((l) => ({ id: l.id, kind: l.kind, recipient: l.recipient, status: l.status, error: l.error, name: l.name, task: l.task, at: (l.sentAt ?? l.at).toISOString() }))}
      templates={templates.map((tp) => ({ id: tp.id, title: tp.title, recurrence: tp.recurrence, weekday: tp.weekday, monthDay: tp.monthDay, dueTime: tp.dueTime, assignAll: tp.assignAll, memberIds: tp.memberIds, checklist: tp.content.checklist.length, links: tp.content.links.length }))}
    />
  );
}
