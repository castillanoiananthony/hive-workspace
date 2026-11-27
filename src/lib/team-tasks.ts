import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assignment, checklistItem, task, taskLink, teamMember, template, type TemplateContent } from "@/db/schema";
import { newToken } from "./tokens";

// Not a server action on purpose: it trusts ownerId, so only server code (actions that checked ownership, the scheduler) may call it.
/** Shared with the scheduler that creates recurring tasks (Phase 5). */
export async function createTeamTask(ownerId: string, teamId: string, tpl: typeof template.$inferSelect | null, dueAt: Date | null, hasTime = false) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(task).values({ ownerId, teamId, templateId: tpl?.id ?? null, title: tpl?.title ?? "", howTo: tpl?.howTo ?? null, dueAt, hasTime }).returning({ id: task.id });
    if (tpl) {
      const c = tpl.content as TemplateContent;
      if (c.checklist.length) await tx.insert(checklistItem).values(c.checklist.map((t, i) => ({ taskId: row.id, text: t, position: i })));
      if (c.links.length) await tx.insert(taskLink).values(c.links.map((l, i) => ({ taskId: row.id, title: l.title, url: l.url, position: i })));
      const members = await tx.select({ id: teamMember.id }).from(teamMember).where(eq(teamMember.teamId, teamId));
      const chosen = tpl.assignAll ? members : members.filter((m) => tpl.memberIds.includes(m.id));
      if (chosen.length) await tx.insert(assignment).values(chosen.map((m) => ({ taskId: row.id, memberId: m.id, doneTokenHash: newToken().hash })));
    }
    return row.id;
  });
}

