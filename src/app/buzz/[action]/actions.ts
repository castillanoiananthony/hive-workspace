"use server";
import { askForHelp, checkActionLink, snoozePart } from "@/lib/buzz";

/** Runs a Snooze or Need help link from an email, after the person confirms on the page (so link scanners can't). */
export async function runBuzzAction(action: string, assignmentId: string, token: string) {
  if ((action !== "snooze" && action !== "help") || !/^[A-Za-z0-9_-]{6,64}$/.test(assignmentId) || !checkActionLink(action, assignmentId, String(token))) {
    return { ok: false as const, message: "This link doesn't work any more. Open the task in HIVE-WORKSPACE instead." };
  }
  if (action === "snooze") {
    const r = await snoozePart(assignmentId);
    return r ? { ok: true as const, message: `Snoozed. No reminders about “${r.title}” until this time tomorrow. The due date hasn't changed.` } : { ok: false as const, message: "That task no longer exists." };
  }
  const r = await askForHelp(assignmentId);
  return r ? { ok: true as const, message: r.already ? `Your team leader already knows you need help with “${r.title}” today.` : `Done. We posted on ${r.team}'s Comb and emailed your team leader that you need help with “${r.title}”.` } : { ok: false as const, message: "That task no longer exists." };
}
