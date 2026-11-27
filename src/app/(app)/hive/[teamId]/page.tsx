import type { Metadata } from "next";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { assignment, combPost, emailLog, task, teamLink, teamMember, teamRole, template, userImage } from "@/db/schema";
import { ALL_PERMS, can } from "@/lib/hive-perms";
import { requireUser } from "@/lib/session";
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
    db.select({ id: task.id, title: task.title, status: task.status, dueAt: task.dueAt, hasTime: task.hasTime, createdAt: task.createdAt }).from(task).where(eq(task.teamId, teamId)).orderBy(asc(task.dueAt), asc(task.createdAt)),
    can(mine, "templates") ? db.select().from(template).where(eq(template.teamId, teamId)).orderBy(asc(template.createdAt)) : Promise.resolve([]),
    can(mine, "log")
      ? db.select({ id: emailLog.id, kind: emailLog.kind, recipient: emailLog.recipient, status: emailLog.status, error: emailLog.error, at: emailLog.createdAt, sentAt: emailLog.sentAt, name: teamMember.name, task: task.title })
          .from(emailLog).leftJoin(teamMember, eq(emailLog.memberId, teamMember.id)).leftJoin(task, eq(emailLog.taskId, task.id))
          .where(eq(emailLog.teamId, teamId)).orderBy(desc(emailLog.createdAt)).limit(100)
      : Promise.resolve([]),
    db.select().from(combPost).where(eq(combPost.teamId, teamId)).orderBy(desc(combPost.createdAt)).limit(50),
    db.select().from(teamLink).where(eq(teamLink.teamId, teamId)).orderBy(desc(teamLink.createdAt)),
  ]);
  const taskIds = tasks.map((x) => x.id);
  const userIds = members.map((m) => m.userId).filter((x): x is string => Boolean(x));
  const [assigned, avatars] = await Promise.all([
    taskIds.length ? db.select({ taskId: assignment.taskId, memberId: assignment.memberId, doneAt: assignment.doneAt }).from(assignment).where(inArray(assignment.taskId, taskIds)) : Promise.resolve([]),
    userIds.length ? db.select({ userId: userImage.userId, updatedAt: userImage.updatedAt }).from(userImage).where(and(eq(userImage.kind, "avatar"), inArray(userImage.userId, userIds))) : Promise.resolve([]),
  ]);
  const avatarOf = (userId: string | null) => { const a = avatars.find((x) => x.userId === userId); return a ? `/api/profile-image/${userId}/avatar?v=${a.updatedAt.getTime()}` : null; };
  const doneMarks = taskIds.length ? await db.select({ taskId: assignment.taskId, memberId: assignment.memberId, at: assignment.doneAt }).from(assignment).where(and(inArray(assignment.taskId, taskIds), isNotNull(assignment.doneAt))) : [];

  return (
    <TeamView
      tz={me.timezone}
      me={{ memberId: mine.id, isAdmin: mine.isAdmin, perms: mine.isAdmin ? ALL_PERMS : mine.perms }}
      team={{ id: t.id, name: t.name, color: t.color, digestEnabled: t.digestEnabled, digestDay: t.digestDay, joinCode: can(mine, "members") ? t.joinCode : null, app: process.env.APP_URL ?? "http://localhost:3000" }}
      members={members.map((m) => ({
        id: m.id, name: m.name, nickname: m.nickname, email: can(mine, "members") || m.id === mine.id ? m.email : null,
        joined: Boolean(m.userId), isAdmin: m.isAdmin, roleId: m.roleId, perms: m.isAdmin ? ALL_PERMS : m.perms, parentId: m.parentId, position: m.position,
        avatar: avatarOf(m.userId), unsubscribed: Boolean(m.unsubscribedAt),
      }))}
      links={links.map((l) => ({ id: l.id, title: l.title, url: l.url, note: l.note, memberId: l.memberId, at: l.createdAt.toISOString() }))}
      roles={roles.map((r) => ({ id: r.id, name: r.name, perms: r.perms }))}
      tasks={tasks.map((x) => ({ id: x.id, title: x.title, status: x.status, dueAt: x.dueAt?.toISOString() ?? null, hasTime: x.hasTime }))}
      assigned={assigned.map((a) => ({ ...a, doneAt: a.doneAt?.toISOString() ?? null }))}
      stream={[
        ...posts.map((p) => ({ kind: "post" as const, id: p.id, at: p.createdAt.toISOString(), memberId: p.memberId, body: p.body })),
        ...doneMarks.map((d) => ({ kind: "done" as const, id: `d-${d.taskId}-${d.memberId}`, at: d.at!.toISOString(), memberId: d.memberId, taskId: d.taskId })),
        ...tasks.filter((x) => x.title).map((x) => ({ kind: "task" as const, id: `t-${x.id}`, at: x.createdAt.toISOString(), memberId: null, taskId: x.id })),
      ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60)}
      log={log.map((l) => ({ id: l.id, kind: l.kind, recipient: l.recipient, status: l.status, error: l.error, name: l.name, task: l.task, at: (l.sentAt ?? l.at).toISOString() }))}
      templates={templates.map((tp) => ({ id: tp.id, title: tp.title, recurrence: tp.recurrence, weekday: tp.weekday, monthDay: tp.monthDay, dueTime: tp.dueTime, assignAll: tp.assignAll, memberIds: tp.memberIds, checklist: tp.content.checklist.length, links: tp.content.links.length }))}
    />
  );
}
