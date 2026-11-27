import type { Metadata } from "next";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HexBadge } from "@/components/app/HexBadge";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { assignment, progressLog, subtask, task } from "@/db/schema";
import { formatDue, isPast } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { teamAccess } from "@/lib/teams";
import { MyTask } from "../MyProgress";
import { MySubtasks } from "./MySubtasks";

export const metadata: Metadata = { title: "Your progress" };

export default function ProgressPage({ params }: PageProps<"/hive/[teamId]/progress">) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<HoneyLoader label="Loading your progress…" />}><Progress params={params} /></Suspense>
    </main>
  );
}

/** Every part of a team task assigned to you: slider, notes, done / not done, and your dated log. */
async function Progress({ params }: { params: PageProps<"/hive/[teamId]/progress">["params"] }) {
  const { teamId } = await params;
  const me = await requireUser();
  const access = await teamAccess(me.id, teamId).catch(() => null);
  if (!access) notFound();
  const { team: t, me: mine } = access;
  const rows = await db.select({ a: assignment, t: task }).from(assignment).innerJoin(task, eq(assignment.taskId, task.id))
    .where(and(eq(task.teamId, teamId), eq(assignment.memberId, mine.id))).orderBy(asc(task.dueAt), asc(task.createdAt));
  const logs = rows.length ? await db.select().from(progressLog).where(inArray(progressLog.assignmentId, rows.map((r) => r.a.id))).orderBy(desc(progressLog.createdAt)) : [];
  const subs = await db.select({ s: subtask, taskTitle: task.title }).from(subtask).innerJoin(task, eq(subtask.taskId, task.id))
    .where(and(eq(task.teamId, teamId), eq(subtask.ownerId, mine.id))).orderBy(asc(subtask.doneAt), asc(subtask.dueAt));
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.a.doneAt ? 100 : r.a.progress), 0) / rows.length) : 0;
  return (
    <>
      <BackButton fallback={`/hive/${teamId}`} label={`Back to ${t.name}`} />
      <div className="flex items-center gap-4">
        <HexBadge label={t.name} color={t.color} size={52} />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold">Your progress</h1>
          <p className="text-muted">{t.name}: {rows.length} {rows.length === 1 ? "task" : "tasks"}, {avg}% done overall.</p>
        </div>
      </div>
      {subs.length > 0 && (
        <section aria-labelledby="mysub-h" className="mt-8">
          <h2 id="mysub-h" className="font-display text-xl font-semibold">Your subtasks <span className="font-normal text-muted">({subs.filter((x) => !x.s.doneAt).length} open)</span></h2>
          <MySubtasks items={subs.map(({ s, taskTitle }) => ({ id: s.id, title: s.title, taskId: s.taskId, taskTitle, due: s.dueAt ? formatDue(s.dueAt, s.hasTime, me.timezone) : null, overdue: isPast(s.dueAt), done: Boolean(s.doneAt) }))} />
        </section>
      )}
      {rows.length > 0 && subs.length > 0 && <h2 className="font-display mt-10 text-xl font-semibold">Your parts of team tasks</h2>}
      {rows.length === 0 && subs.length > 0 ? null : rows.length === 0 ? (
        <p className="mt-8 rounded-[calc(var(--radius)*2)] border border-dashed border-line p-8 text-center text-muted">Nothing is assigned to you in this team yet.</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {rows.map(({ a, t: x }, i) => (
            <MyTask key={x.id} open={i === 0 && rows.length <= 3} tz={me.timezone} colors={t.importanceColors ?? null}
              t={{ id: x.id, title: x.title, status: x.status, dueAt: x.dueAt?.toISOString() ?? null, hasTime: x.hasTime, importance: x.importance }}
              a={{ taskId: x.id, memberId: mine.id, doneAt: a.doneAt?.toISOString() ?? null, progress: a.progress }}
              logs={logs.filter((l) => l.assignmentId === a.id).map((l) => ({ id: l.id, taskId: x.id, memberId: mine.id, progress: l.progress, done: l.done, note: l.note, at: l.createdAt.toISOString() }))} />
          ))}
        </ul>
      )}
    </>
  );
}
