import "server-only";
import { createHmac } from "node:crypto";
import { render } from "@react-email/components";
import { and, asc, eq, inArray, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { createElement } from "react";
import { Resend } from "resend";
import { db } from "@/db";
import { assignment, checklistItem, emailLog, task, taskLink, team, teamMember, template, user } from "@/db/schema";
import { DigestEmail, digestText, type DigestProps } from "@/emails/DigestEmail";
import { TaskEmail, taskEmailText, type TaskEmailProps } from "@/emails/TaskEmail";
import { formatDue, utcToZoned, zonedToUtc } from "./dates";
import { docToHtml, docToText } from "./doc-to-html";
import { nameFromEmail } from "./roster";
import { daysLeft, localHour, nextOccurrence } from "./schedule";
import { createTeamTask } from "./team-tasks";
import { hashToken } from "./tokens";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "HIVE-WORKSPACE <hello@hive-workspace.com>";
const app = () => process.env.APP_URL ?? "http://localhost:3000";
const DAY = 86400000;

// ---------- link tokens ----------
// Derived from the server secret, so every email for an assignment carries the same link and nothing secret is stored.
const mac = (purpose: string, id: string) => createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(`${purpose}:${id}`).digest("base64url");

async function doneLink(assignmentId: string) {
  const token = mac("done", assignmentId);
  await db.update(assignment).set({ doneTokenHash: hashToken(token) }).where(eq(assignment.id, assignmentId));
  return `${app()}/done/${token}`;
}
async function unsubscribeLinks(memberId: string) {
  const token = mac("unsub", memberId);
  await db.update(teamMember).set({ unsubscribeTokenHash: hashToken(token) }).where(eq(teamMember.id, memberId));
  return { page: `${app()}/unsubscribe/${token}`, oneClick: `${app()}/api/unsubscribe/${token}` };
}

// ---------- send exactly once ----------

type Kind = "assign" | "remind3" | "remind1" | "digest";

/**
 * Claims `dedupeKey` in the email log before sending. The unique key means a second run (or two runs at once)
 * gets nothing back and sends nothing. A key whose last attempt failed can be claimed again, so failures retry.
 */
async function claim(key: string, row: { teamId: string; memberId: string; taskId: string | null; kind: Kind; recipient: string }) {
  const [hit] = await db.insert(emailLog).values({ ...row, dedupeKey: key, status: "queued" })
    .onConflictDoUpdate({ target: emailLog.dedupeKey, set: { status: "queued", error: null, createdAt: new Date() }, setWhere: sql`${emailLog.status} = 'failed'` })
    .returning({ id: emailLog.id });
  return hit?.id ?? null;
}

let lastSend = 0;
async function deliver(logId: string, to: string, subject: string, element: React.ReactElement, text: string, oneClickUnsubscribe: string) {
  // Resend's free plan allows 2 requests a second
  const wait = lastSend + 600 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSend = Date.now();
  try {
    const html = await render(element);
    const { data, error } = await resend.emails.send({
      from: FROM, to, subject, html, text,
      headers: { "List-Unsubscribe": `<${oneClickUnsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (error) throw new Error(error.message);
    await db.update(emailLog).set({ status: "sent", providerId: data?.id ?? null, sentAt: new Date() }).where(eq(emailLog.id, logId));
    return true;
  } catch (err) {
    await db.update(emailLog).set({ status: "failed", error: String(err instanceof Error ? err.message : err).slice(0, 500) }).where(eq(emailLog.id, logId));
    return false;
  }
}

const ownerName = (o: { name: string; email: string }) => o.name.trim() || nameFromEmail(o.email);
const due = (at: Date | null, hasTime: boolean, tz: string) => (at ? `${formatDue(at, hasTime, tz)}${hasTime ? ` (${tz.split("/").pop()!.replace(/_/g, " ")} time)` : ""}` : null);

// ---------- assignment emails and reminders ----------

async function loadAssignment(assignmentId: string) {
  const [row] = await db
    .select({ a: assignment, t: task, m: teamMember, team: { id: team.id, name: team.name, color: team.color }, owner: { name: user.name, email: user.email, tz: user.timezone } })
    .from(assignment)
    .innerJoin(task, eq(assignment.taskId, task.id))
    .innerJoin(teamMember, eq(assignment.memberId, teamMember.id))
    .innerJoin(team, eq(task.teamId, team.id))
    .innerJoin(user, eq(team.ownerId, user.id))
    .where(eq(assignment.id, assignmentId));
  return row;
}

export async function sendTaskEmail(assignmentId: string, kind: "assign" | "remind3" | "remind1", whenText?: string) {
  const r = await loadAssignment(assignmentId);
  if (!r || r.m.unsubscribedAt || (kind !== "assign" && (r.a.doneAt || r.t.status === "done"))) return false;
  const key = kind === "assign" ? `assign:${r.a.id}` : `${kind}:${r.a.id}:${r.t.dueAt?.toISOString()}`;
  const logId = await claim(key, { teamId: r.team.id, memberId: r.m.id, taskId: r.t.id, kind, recipient: r.m.email });
  if (!logId) return false;
  const [items, links, doneUrl, unsub] = await Promise.all([
    db.select({ text: checklistItem.text }).from(checklistItem).where(eq(checklistItem.taskId, r.t.id)).orderBy(asc(checklistItem.position)),
    db.select({ title: taskLink.title, url: taskLink.url }).from(taskLink).where(eq(taskLink.taskId, r.t.id)).orderBy(asc(taskLink.position)),
    doneLink(r.a.id),
    unsubscribeLinks(r.m.id),
  ]);
  const props: TaskEmailProps = {
    kind, app: app(), team: r.team.name, teamColor: r.team.color, ownerName: ownerName(r.owner), memberName: r.m.name,
    title: r.t.title, due: due(r.t.dueAt, r.t.hasTime, r.owner.tz), howToHtml: docToHtml(r.t.howTo), links, checklist: items.map((i) => i.text),
    doneUrl, unsubscribeUrl: unsub.page, whenText,
  };
  const subject = kind === "assign" ? `New task: ${r.t.title || "Untitled task"}` : `Reminder: ${r.t.title || "Untitled task"} is ${whenText ?? "due soon"}`;
  const ok = await deliver(logId, r.m.email, subject, createElement(TaskEmail, props), taskEmailText(props, docToText(r.t.howTo)), unsub.oneClick);
  if (ok && kind === "assign") await db.update(assignment).set({ notifiedAt: new Date() }).where(eq(assignment.id, r.a.id));
  return ok;
}

/** Emails everyone assigned to a task who hasn't been told yet. `olderThanMs` lets the hourly sweep skip brand-new edits. */
export async function sendPendingAssignments(taskId?: string, olderThanMs = 0) {
  const rows = await db.select({ id: assignment.id }).from(assignment).innerJoin(task, eq(assignment.taskId, task.id))
    .where(and(isNull(assignment.notifiedAt), isNull(assignment.doneAt), ne(task.title, ""), taskId ? eq(assignment.taskId, taskId) : undefined, olderThanMs ? lt(assignment.createdAt, new Date(Date.now() - olderThanMs)) : undefined));
  let sent = 0;
  for (const r of rows) if (await sendTaskEmail(r.id, "assign")) sent++;
  return sent;
}

export async function runReminders(now = new Date()) {
  const rows = await db
    .select({ id: assignment.id, notifiedAt: assignment.notifiedAt, dueAt: task.dueAt, tz: user.timezone })
    .from(assignment)
    .innerJoin(task, eq(assignment.taskId, task.id))
    .innerJoin(teamMember, eq(assignment.memberId, teamMember.id))
    .innerJoin(team, eq(task.teamId, team.id))
    .innerJoin(user, eq(team.ownerId, user.id))
    .where(and(isNull(assignment.doneAt), isNotNull(assignment.notifiedAt), isNull(teamMember.unsubscribedAt), ne(task.status, "done"), isNotNull(task.dueAt),
      lt(task.dueAt, new Date(now.getTime() + 4 * DAY)), sql`${task.dueAt} > ${now}`));
  let sent = 0;
  for (const r of rows) {
    const h = localHour(now, r.tz);
    if (h < 8 || h >= 20) continue; // no night-time pings in the owner's zone
    const left = daysLeft(r.dueAt!, now, r.tz);
    const sinceNotified = now.getTime() - r.notifiedAt!.getTime();
    const when = left === 0 ? "due today" : left === 1 ? "due tomorrow" : `due in ${left} days`;
    if (left >= 2 && left <= 3 && sinceNotified > DAY) { if (await sendTaskEmail(r.id, "remind3", when)) sent++; }
    else if (left <= 1 && sinceNotified > 6 * 3600000) { if (await sendTaskEmail(r.id, "remind1", when)) sent++; }
  }
  return sent;
}

// ---------- weekly digest ----------

export async function runDigests(now = new Date()) {
  const teams = await db.select({ t: team, tz: user.timezone, ownerName: user.name, ownerEmail: user.email }).from(team).innerJoin(user, eq(team.ownerId, user.id)).where(eq(team.digestEnabled, true));
  let sent = 0;
  for (const { t, tz, ownerName: on, ownerEmail } of teams) {
    const local = utcToZoned(now, tz);
    if (new Date(`${local.date}T00:00:00Z`).getUTCDay() !== t.digestDay || localHour(now, tz) < 8) continue;
    const tasks = await db.select().from(task).where(and(eq(task.teamId, t.id), ne(task.status, "done"))).orderBy(asc(task.dueAt));
    if (!tasks.length) continue;
    const [members, assigned] = await Promise.all([
      db.select().from(teamMember).where(and(eq(teamMember.teamId, t.id), isNull(teamMember.unsubscribedAt))),
      db.select().from(assignment).where(inArray(assignment.taskId, tasks.map((x) => x.id))),
    ]);
    for (const m of members) {
      const logId = await claim(`digest:${t.id}:${m.id}:${local.date}`, { teamId: t.id, memberId: m.id, taskId: null, kind: "digest", recipient: m.email });
      if (!logId) continue;
      const items = await Promise.all(tasks.map(async (x) => {
        const mineRow = assigned.find((a) => a.taskId === x.id && a.memberId === m.id && !a.doneAt);
        return { x, item: { title: x.title, due: due(x.dueAt, x.hasTime, tz), mine: Boolean(mineRow), doneUrl: mineRow ? await doneLink(mineRow.id) : null } };
      }));
      const unsub = await unsubscribeLinks(m.id);
      const left = (x: typeof tasks[number]) => (x.dueAt ? daysLeft(x.dueAt, now, tz) : null);
      const props: DigestProps = {
        app: app(), team: t.name, teamColor: t.color, ownerName: ownerName({ name: on, email: ownerEmail }), memberName: m.name, unsubscribeUrl: unsub.page,
        overdue: items.filter(({ x }) => x.dueAt && x.dueAt < now).map((i) => i.item),
        thisWeek: items.filter(({ x }) => x.dueAt && x.dueAt >= now && left(x)! <= 7).map((i) => i.item),
        later: items.filter(({ x }) => !x.dueAt || left(x)! > 7).map((i) => i.item),
      };
      if (await deliver(logId, m.email, `${t.name}: your week (${props.overdue.length} overdue, ${props.thisWeek.length} due soon)`, createElement(DigestEmail, props), digestText(props), unsub.oneClick)) sent++;
    }
  }
  return sent;
}

// ---------- recurring templates ----------

/** Creates each repeating task 3 days before it's due (so the assignment email gives people time), once per occurrence. */
export async function runRecurring(now = new Date()) {
  const rows = await db.select({ tpl: template, ownerId: team.ownerId, tz: user.timezone }).from(template).innerJoin(team, eq(template.teamId, team.id)).innerJoin(user, eq(team.ownerId, user.id)).where(ne(template.recurrence, "none"));
  let created = 0;
  for (const { tpl, ownerId, tz } of rows) {
    if (localHour(now, tz) < 8) continue;
    const today = utcToZoned(now, tz).date;
    const dueDate = nextOccurrence(today, tpl as { recurrence: "weekly" | "monthly"; weekday: number | null; monthDay: number | null });
    if ((Date.parse(dueDate) - Date.parse(today)) / DAY > 3) continue;
    // claim this occurrence: only one run can move lastRunPeriod to this date
    const [won] = await db.update(template).set({ lastRunPeriod: dueDate })
      .where(and(eq(template.id, tpl.id), sql`${template.lastRunPeriod} is distinct from ${dueDate}`)).returning({ id: template.id });
    if (!won) continue;
    const taskId = await createTeamTask(ownerId, tpl.teamId, tpl, zonedToUtc(dueDate, tpl.dueTime, tz), Boolean(tpl.dueTime));
    await sendPendingAssignments(taskId);
    created++;
  }
  return created;
}

/** Everything the hourly scheduler does, in order. Safe to run twice: every step claims its work first. */
export async function runHourly(now = new Date()) {
  const recurring = await runRecurring(now);
  const assignments = await sendPendingAssignments(undefined, 10 * 60000); // stragglers the editor didn't send
  const reminders = await runReminders(now);
  const digests = await runDigests(now);
  return { recurring, assignments, reminders, digests };
}
