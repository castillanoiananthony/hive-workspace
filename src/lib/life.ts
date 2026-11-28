import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignment, classSlot, focus, semester, subject, subtask, task, teamMember } from "@/db/schema";
import { utcToZoned } from "./dates";
import { currentTerm, nectar } from "./student";

/** Everything My Cell and Home show about student life: subjects, current term, exams, Today's 3 and Nectar. */
export async function lifeData(me: { id: string; timezone: string }) {
  const today = utcToZoned(new Date(), me.timezone).date;
  const since = new Date(Date.now() - 60 * 86_400_000); // a 60-day window is plenty for a streak
  const [subjects, sems, slots, [todayFocus], exams, doneTasks, doneParts, doneSubs] = await Promise.all([
    db.select().from(subject).where(eq(subject.ownerId, me.id)).orderBy(asc(subject.position), asc(subject.createdAt)),
    db.select().from(semester).where(eq(semester.ownerId, me.id)).orderBy(desc(semester.start)),
    db.select().from(classSlot).where(eq(classSlot.ownerId, me.id)).orderBy(asc(classSlot.weekday), asc(classSlot.start)),
    db.select().from(focus).where(and(eq(focus.userId, me.id), eq(focus.date, today))),
    db.select({ id: task.id, title: task.title, dueAt: task.dueAt, subjectId: task.subjectId }).from(task)
      .where(and(eq(task.ownerId, me.id), isNull(task.teamId), eq(task.isExam, true), isNull(task.doneAt), isNotNull(task.dueAt), gte(task.dueAt, new Date(Date.now() - 86_400_000)))).orderBy(asc(task.dueAt)).limit(5),
    db.select({ at: task.doneAt }).from(task).where(and(eq(task.ownerId, me.id), isNull(task.teamId), gte(task.doneAt, since))),
    db.select({ at: assignment.doneAt }).from(assignment).innerJoin(teamMember, eq(assignment.memberId, teamMember.id)).where(and(eq(teamMember.userId, me.id), gte(assignment.doneAt, since))),
    db.select({ at: subtask.doneAt }).from(subtask).innerJoin(teamMember, eq(subtask.ownerId, teamMember.id)).where(and(eq(teamMember.userId, me.id), gte(subtask.doneAt, since))),
  ]);
  const sem = sems.find((s) => s.start <= today && today <= s.end) ?? sems.find((s) => s.start > today) ?? null;
  const days = [...doneTasks, ...doneParts, ...doneSubs].filter((r) => r.at).map((r) => utcToZoned(r.at!, me.timezone).date);
  const focusIds = todayFocus?.taskIds ?? [];
  const focusTasks = focusIds.length ? await db.select({ id: task.id, title: task.title, status: task.status, subjectId: task.subjectId }).from(task).where(and(eq(task.ownerId, me.id), inArray(task.id, focusIds))) : [];
  const dayMs = (d: Date) => Math.round((new Date(`${utcToZoned(d, me.timezone).date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000);
  return {
    today,
    subjects: subjects.map((s) => ({ id: s.id, code: s.code, color: s.color })),
    semesters: sems.map((s) => ({ id: s.id, name: s.name, start: s.start, end: s.end, periods: s.periods })),
    semester: sem && { name: sem.name, term: currentTerm(sem.periods, today), upcoming: sem.start > today },
    slots: slots.map((s) => ({ id: s.id, subjectId: s.subjectId, title: s.title, weekday: s.weekday, start: s.start, end: s.end, room: s.room })),
    exams: exams.map((e) => ({ id: e.id, title: e.title || "Exam", subjectId: e.subjectId, inDays: dayMs(e.dueAt!) })),
    focus: focusIds.map((id) => focusTasks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((t) => ({ id: t.id, title: t.title || "Untitled task", done: t.status === "done", subjectId: t.subjectId })),
    nectar: nectar(days, today),
  };
}
export type Life = Awaited<ReturnType<typeof lifeData>>;
