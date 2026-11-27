import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignment, contribution, progressLog, task, teamMember } from "@/db/schema";


export type { ContributionRow } from "./csv";
import type { ContributionRow } from "./csv";

/** The team's contribution log (completions, reviews, approvals) together with progress updates, newest first. */
export async function contributionRows(teamId: string, memberId?: string | null): Promise<ContributionRow[]> {
  const name = (m: { name: string | null; nickname: string | null } | null) => (m?.nickname?.trim() || m?.name || "Former member");
  const [cs, ps] = await Promise.all([
    db.select({ c: contribution, name: teamMember.name, nickname: teamMember.nickname }).from(contribution).leftJoin(teamMember, eq(contribution.memberId, teamMember.id))
      .where(and(eq(contribution.teamId, teamId), memberId ? eq(contribution.memberId, memberId) : undefined)).orderBy(desc(contribution.createdAt)).limit(2000),
    db.select({ p: progressLog, memberId: assignment.memberId, title: task.title, name: teamMember.name, nickname: teamMember.nickname }).from(progressLog)
      .innerJoin(assignment, eq(progressLog.assignmentId, assignment.id)).innerJoin(task, eq(assignment.taskId, task.id)).leftJoin(teamMember, eq(assignment.memberId, teamMember.id))
      .where(and(eq(progressLog.teamId, teamId), memberId ? eq(assignment.memberId, memberId) : undefined)).orderBy(desc(progressLog.createdAt)).limit(2000),
  ]);
  return [
    ...cs.map((r) => ({ at: r.c.createdAt, member: name(r), memberId: r.c.memberId, kind: r.c.kind as string, what: r.c.what, detail: "" })),
    ...ps.filter((r) => !r.p.done).map((r) => ({ at: r.p.createdAt, member: name(r), memberId: r.memberId, kind: "progress", what: r.title || "Untitled task", detail: `${r.p.progress}%${r.p.note ? `: ${r.p.note}` : ""}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
}

