import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { assignment, goal, task, team, teamMember } from "@/db/schema";
import { computeProgress } from "./progress";

/**
 * The Home feed, built from what already happened in the app (no separate activity log).
 * Each item has a `kind`, so new kinds (later: sponsored posts) only need a new case where items are drawn.
 */
export type FeedItem =
  | { kind: "teammate_done"; id: string; at: string; member: string; color: string; team: string; teamId: string; task: string; taskId: string }
  | { kind: "you_done"; id: string; at: string; task: string; taskId: string; goal: string | null; goalProgress: number | null }
  | { kind: "assigned"; id: string; at: string; task: string; taskId: string; team: string; teamId: string; color: string; people: string[]; dueAt: string | null; hasTime: boolean }
  | { kind: "goal_new"; id: string; at: string; goal: string; level: string; progress: number }
  | { kind: "goal_done"; id: string; at: string; goal: string; level: string };

export async function buildFeed(userId: string, limit = 40): Promise<FeedItem[]> {
  const [teamDone, myDone, teamTasks, goals, allTasks] = await Promise.all([
    db.select({ id: assignment.id, at: assignment.doneAt, member: teamMember.name, color: team.color, team: team.name, teamId: team.id, task: task.title, taskId: task.id })
      .from(assignment).innerJoin(task, eq(assignment.taskId, task.id)).innerJoin(team, eq(task.teamId, team.id)).innerJoin(teamMember, eq(assignment.memberId, teamMember.id))
      .where(and(eq(team.ownerId, userId), isNotNull(assignment.doneAt))).orderBy(desc(assignment.doneAt)).limit(limit),
    db.select({ id: task.id, at: task.updatedAt, task: task.title, goalId: task.goalId })
      .from(task).where(and(eq(task.ownerId, userId), isNull(task.teamId), eq(task.status, "done"))).orderBy(desc(task.updatedAt)).limit(limit),
    db.select({ id: task.id, at: task.createdAt, task: task.title, team: team.name, teamId: team.id, color: team.color, dueAt: task.dueAt, hasTime: task.hasTime })
      .from(task).innerJoin(team, eq(task.teamId, team.id)).where(and(eq(team.ownerId, userId), ne(task.title, ""))).orderBy(desc(task.createdAt)).limit(limit),
    db.select().from(goal).where(and(eq(goal.ownerId, userId), isNull(goal.archivedAt))),
    db.select({ goalId: task.goalId, status: task.status }).from(task).where(and(eq(task.ownerId, userId), isNull(task.teamId))),
  ]);
  const people = teamTasks.length
    ? await db.select({ taskId: assignment.taskId, name: teamMember.name }).from(assignment).innerJoin(teamMember, eq(assignment.memberId, teamMember.id)).where(inArray(assignment.taskId, teamTasks.map((t) => t.id)))
    : [];
  const progress = computeProgress(goals, allTasks);
  const goalTitle = new Map(goals.map((g) => [g.id, g.title]));

  const items: FeedItem[] = [
    ...teamDone.map((r) => ({ kind: "teammate_done" as const, id: `td-${r.id}`, at: r.at!.toISOString(), member: r.member, color: r.color, team: r.team, teamId: r.teamId, task: r.task || "Untitled task", taskId: r.taskId })),
    ...myDone.map((r) => ({ kind: "you_done" as const, id: `yd-${r.id}`, at: r.at.toISOString(), task: r.task || "Untitled task", taskId: r.id, goal: r.goalId ? goalTitle.get(r.goalId) ?? null : null, goalProgress: r.goalId ? progress.get(r.goalId) ?? null : null })),
    ...teamTasks.map((r) => ({ kind: "assigned" as const, id: `as-${r.id}`, at: r.at.toISOString(), task: r.task, taskId: r.id, team: r.team, teamId: r.teamId, color: r.color, people: people.filter((p) => p.taskId === r.id).map((p) => p.name), dueAt: r.dueAt?.toISOString() ?? null, hasTime: r.hasTime })),
    ...goals.map((g) => ({ kind: "goal_new" as const, id: `gn-${g.id}`, at: g.createdAt.toISOString(), goal: g.title, level: g.level, progress: progress.get(g.id) ?? 0 })),
    ...goals.filter((g) => (progress.get(g.id) ?? 0) >= 100).map((g) => ({ kind: "goal_done" as const, id: `gd-${g.id}`, at: g.lastActivityAt.toISOString(), goal: g.title, level: g.level })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
