import "server-only";
import { db } from "@/db";
import { contribution } from "@/db/schema";

type Kind = "part_done" | "subtask_done" | "sent_for_review" | "approved";

/** Writes one line in the team's contribution log. Never throws: the log must not block the work itself. */
export async function recordContribution(row: { teamId: string; memberId: string | null; kind: Kind; what: string; taskId?: string | null; subtaskId?: string | null }) {
  await db.insert(contribution).values({ ...row, what: row.what.slice(0, 200) || "Untitled task" }).catch((e) => console.error("contribution log", e));
}
