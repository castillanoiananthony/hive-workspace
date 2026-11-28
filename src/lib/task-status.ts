import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignment, task } from "@/db/schema";

/**
 * Follows the parts: when every part is done the task waits in Needs Review for the Leader to approve it;
 * in progress once anyone has started. An approved (Done) task stays Done unless a part is reopened.
 */
export async function syncTaskStatus(taskId: string) {
  const [t] = await db.select({ status: task.status }).from(task).where(eq(task.id, taskId));
  const parts = await db.select({ doneAt: assignment.doneAt, progress: assignment.progress }).from(assignment).where(eq(assignment.taskId, taskId));
  if (!t || !parts.length) return;
  const all = parts.every((p) => p.doneAt), any = parts.some((p) => p.doneAt || p.progress > 0);
  const status = all ? (t.status === "done" ? "done" : "review") : any ? "doing" : "todo";
  if (status !== t.status) await db.update(task).set({ status, doneAt: doneAtFor(status) }).where(eq(task.id, taskId));
}

/** For an update: keeps the first finish time while a task stays done, clears it when reopened. */
export const doneAtFor = (status: string) => (status === "done" ? sql`coalesce(${task.doneAt}, now())` : null);
