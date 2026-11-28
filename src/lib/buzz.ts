import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { render } from "@react-email/components";
import { and, asc, eq, inArray, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { createElement } from "react";
import { Resend } from "resend";
import { db } from "@/db";
import { assignment, checklistItem, colony, colonyMember, colonyPost, combPost, emailLog, subtask, task, taskLink, team, teamMember, template, user } from "@/db/schema";
import { dailyDigestEmail, helpEmail, subtaskEmail, type DailyItem } from "./email";
import { DigestEmail, digestText, type DigestProps } from "@/emails/DigestEmail";
import { InviteEmail, inviteText } from "@/emails/InviteEmail";
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
/** Signed one-click links for Snooze and Need help; nothing stored, the signature is the proof. */
export const actionLink = (action: "snooze" | "help", assignmentId: string) => `${app()}/buzz/${action}?a=${assignmentId}&t=${mac(action, assignmentId)}`;
export const checkActionLink = (action: "snooze" | "help", assignmentId: string, token: string) => {
  const want = Buffer.from(mac(action, assignmentId)), got = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
};

/** How this member wants Buzz emails: people with an account choose in Settings; invitees get them as they happen. */
export async function buzzModeOf(member: { userId: string | null }) {
  if (!member.userId) return "instant" as const;
  const [u] = await db.select({ mode: user.buzzMode }).from(user).where(eq(user.id, member.userId));
  return u?.mode ?? "instant";
}

export async function unsubscribeLinks(memberId: string) {
  const token = mac("unsub", memberId);
  await db.update(teamMember).set({ unsubscribeTokenHash: hashToken(token) }).where(eq(teamMember.id, memberId));
  return { page: `${app()}/unsubscribe/${token}`, oneClick: `${app()}/api/unsubscribe/${token}` };
}

// ---------- send exactly once ----------

type Kind = "assign" | "remind3" | "remind1" | "remind0" | "digest" | "invite" | "daily" | "subtask" | "help";

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
async function deliver(logId: string, to: string, subject: string, element: React.ReactElement | { html: string }, text: string, oneClickUnsubscribe: string | null, cc?: string) {
  // Resend's free plan allows 2 requests a second
  const wait = lastSend + 600 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSend = Date.now();
  try {
    const html = "html" in element && typeof element.html === "string" ? element.html : await render(element as React.ReactElement);
    const { data, error } = await resend.emails.send({
      from: FROM, to, subject, html, text, ...(cc && cc !== to ? { cc } : {}),
      ...(oneClickUnsubscribe ? { headers: { "List-Unsubscribe": `<${oneClickUnsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
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

export async function sendTaskEmail(assignmentId: string, kind: "assign" | "remind3" | "remind1" | "remind0", whenText?: string) {
  const r = await loadAssignment(assignmentId);
  if (!r || r.m.unsubscribedAt || (kind !== "assign" && (r.a.doneAt || r.t.status === "done"))) return false;
  if ((await buzzModeOf(r.m)) !== "instant") return false; // digest people get it in their daily email; "off" means no emails
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
    snoozeUrl: kind === "assign" ? undefined : actionLink("snooze", r.a.id), helpUrl: actionLink("help", r.a.id),
  };
  const subject = kind === "assign" ? `New task: ${r.t.title || "Untitled task"}` : `Reminder: ${r.t.title || "Untitled task"} is ${whenText ?? "due soon"}`;
  // on the due day the team leader is copied in, so nobody is surprised at the deadline
  const cc = kind === "remind0" ? (await db.select({ email: teamMember.email }).from(teamMember).where(and(eq(teamMember.teamId, r.team.id), eq(teamMember.isAdmin, true))))[0]?.email : undefined;
  const ok = await deliver(logId, r.m.email, subject, createElement(TaskEmail, props), taskEmailText(props, docToText(r.t.howTo)), unsub.oneClick, cc);
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
    .select({ id: assignment.id, notifiedAt: assignment.notifiedAt, snoozedUntil: assignment.snoozedUntil, dueAt: task.dueAt, tz: user.timezone })
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
    if (r.snoozedUntil && r.snoozedUntil > now) continue; // they pressed Snooze
    const left = daysLeft(r.dueAt!, now, r.tz);
    const sinceNotified = now.getTime() - r.notifiedAt!.getTime();
    const when = left === 0 ? "due today" : left === 1 ? "due tomorrow" : `due in ${left} days`;
    if (left >= 2 && left <= 3 && sinceNotified > DAY) { if (await sendTaskEmail(r.id, "remind3", when)) sent++; }
    else if (left === 1 && sinceNotified > 6 * 3600000) { if (await sendTaskEmail(r.id, "remind1", when)) sent++; }
    else if (left === 0 && sinceNotified > 3 * 3600000) { if (await sendTaskEmail(r.id, "remind0", when)) sent++; }
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
      if ((await buzzModeOf(m)) !== "instant") continue; // daily-digest people already get one email a day; "off" gets none
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

/** "X added you to Team": a sign-up invite, or a heads-up for people who already have an account. Once per member. */
export async function sendInvites(memberIds: string[], inviter: string) {
  for (const id of memberIds) {
    const [r] = await db.select({ m: teamMember, t: team }).from(teamMember).innerJoin(team, eq(teamMember.teamId, team.id)).where(eq(teamMember.id, id));
    if (!r || r.m.isAdmin) continue;
    const logId = await claim(`invite:${r.m.id}`, { teamId: r.t.id, memberId: r.m.id, taskId: null, kind: "invite", recipient: r.m.email });
    if (!logId) continue;
    const unsub = await unsubscribeLinks(r.m.id);
    const hasAccount = Boolean(r.m.userId);
    const props = { app: app(), team: r.t.name, teamColor: r.t.color, inviter, memberName: r.m.name, hasAccount, url: hasAccount ? `${app()}/hive/${r.t.id}` : `${app()}/signin`, unsubscribeUrl: unsub.page };
    await deliver(logId, r.m.email, `${inviter} added you to ${r.t.name}`, createElement(InviteEmail, props), inviteText(props), unsub.oneClick);
  }
}

/** Everything the hourly scheduler does, in order. Safe to run twice: every step claims its work first. */
export async function runHourly(now = new Date()) {
  const recurring = await runRecurring(now);
  const assignments = await sendPendingAssignments(undefined, 10 * 60000); // stragglers the editor didn't send
  const reminders = await runReminders(now);
  const digests = await runDigests(now);
  const subtasks = await runSubtaskReminders(now);
  const daily = await runDailyBuzz(now);
  return { recurring, assignments, reminders, digests, subtasks, daily };
}

// ---------- subtask reminders (instant mode) ----------

/** Reminds a subtask's one owner the day before and on the due day. People on the daily digest get it there instead. */
export async function runSubtaskReminders(now = new Date()) {
  const rows = await db.select({ s: subtask, t: { id: task.id, title: task.title }, team: { id: team.id, name: team.name }, m: teamMember, tz: user.timezone })
    .from(subtask).innerJoin(task, eq(subtask.taskId, task.id)).innerJoin(team, eq(task.teamId, team.id)).innerJoin(teamMember, eq(subtask.ownerId, teamMember.id)).innerJoin(user, eq(team.ownerId, user.id))
    .where(and(isNull(subtask.doneAt), isNotNull(subtask.dueAt), isNull(teamMember.unsubscribedAt), lt(subtask.dueAt, new Date(now.getTime() + 2 * DAY)), sql`${subtask.dueAt} > ${now}`));
  let sent = 0;
  for (const r of rows) {
    const h = localHour(now, r.tz);
    if (h < 8 || h >= 20 || (await buzzModeOf(r.m)) !== "instant") continue;
    const left = daysLeft(r.s.dueAt!, now, r.tz);
    if (left > 1) continue;
    const when = left === 0 ? "due today" : "due tomorrow";
    const logId = await claim(`subtask:${r.s.id}:${left}`, { teamId: r.team.id, memberId: r.m.id, taskId: r.t.id, kind: "subtask", recipient: r.m.email });
    if (!logId) continue;
    const mail = subtaskEmail({ name: r.m.name, title: r.s.title, task: r.t.title || "Untitled task", team: r.team.name, when, url: r.m.userId ? `${app()}/tasks/${r.t.id}` : `${app()}/signin`, settingsUrl: `${app()}/settings#buzz` });
    if (await deliver(logId, r.m.email, `Your subtask is ${when}: ${r.s.title}`, mail, mail.text, (await unsubscribeLinks(r.m.id)).oneClick)) sent++;
  }
  return sent;
}

// ---------- daily digest (one email a day for people who chose it) ----------

/** At 8:00 in each digest person's time zone: new parts, parts and subtasks due within 3 days, and class announcements, in one email. */
export async function runDailyBuzz(now = new Date()) {
  const people = await db.select().from(user).where(eq(user.buzzMode, "digest"));
  let sent = 0;
  for (const u of people) {
    const today = utcToZoned(now, u.timezone).date;
    if (localHour(now, u.timezone) < 8 || (u.lastDigestAt && utcToZoned(u.lastDigestAt, u.timezone).date === today)) continue;
    const members = await db.select().from(teamMember).where(and(eq(teamMember.userId, u.id), isNull(teamMember.unsubscribedAt)));
    const items: DailyItem[] = [];
    let firstTeam: string | null = null, firstMember: string | null = null;
    const notify: string[] = [];
    if (members.length) {
      const ids = members.map((m) => m.id);
      const soon = new Date(now.getTime() + 3 * DAY);
      const [parts, subs] = await Promise.all([
        db.select({ a: assignment, t: task, team: { id: team.id, name: team.name } }).from(assignment).innerJoin(task, eq(assignment.taskId, task.id)).innerJoin(team, eq(task.teamId, team.id))
          .where(and(inArray(assignment.memberId, ids), isNull(assignment.doneAt), ne(task.status, "done"), ne(task.title, ""))),
        db.select({ s: subtask, t: { id: task.id, title: task.title }, team: { id: team.id, name: team.name } }).from(subtask).innerJoin(task, eq(subtask.taskId, task.id)).innerJoin(team, eq(task.teamId, team.id))
          .where(and(inArray(subtask.ownerId, ids), isNull(subtask.doneAt), isNotNull(subtask.dueAt), lt(subtask.dueAt, soon))),
      ]);
      for (const p of parts) {
        const isNew = !p.a.notifiedAt, dueSoon = p.t.dueAt && p.t.dueAt < soon && !(p.a.snoozedUntil && p.a.snoozedUntil > now);
        if (!isNew && !dueSoon) continue;
        firstTeam ??= p.team.id; firstMember ??= p.a.memberId;
        if (isNew) notify.push(p.a.id);
        items.push({ kind: isNew ? "new" : "due", title: p.t.title, context: p.team.name, when: p.t.dueAt ? `due ${formatDue(p.t.dueAt, p.t.hasTime, u.timezone)}` : null,
          doneUrl: await doneLink(p.a.id), snoozeUrl: isNew ? undefined : actionLink("snooze", p.a.id), helpUrl: actionLink("help", p.a.id), openUrl: `${app()}/tasks/${p.t.id}` });
      }
      for (const s of subs) {
        firstTeam ??= s.team.id; firstMember ??= s.s.ownerId;
        items.push({ kind: "subtask", title: s.s.title, context: `${s.t.title || "Untitled task"}, ${s.team.name}`, when: `due ${formatDue(s.s.dueAt!, s.s.hasTime, u.timezone)}`, openUrl: `${app()}/tasks/${s.t.id}` });
      }
      // class announcements since the last digest, from classes they're in
      const since = u.lastDigestAt ?? new Date(now.getTime() - DAY);
      const posts = await db.select({ body: colonyPost.body, colony: colony.name, colonyId: colony.id }).from(colonyPost).innerJoin(colony, eq(colonyPost.colonyId, colony.id))
        .innerJoin(colonyMember, and(eq(colonyMember.colonyId, colony.id), eq(colonyMember.userId, u.id))).where(sql`${colonyPost.createdAt} > ${since}`);
      for (const p of posts) items.push({ kind: "announce", title: p.body.length > 140 ? `${p.body.slice(0, 137)}…` : p.body, context: p.colony, when: null, openUrl: `${app()}/colony/${p.colonyId}` });
      firstTeam ??= members[0].teamId; firstMember ??= members[0].id;
    }
    await db.update(user).set({ lastDigestAt: now }).where(eq(user.id, u.id));
    if (!items.length || !firstTeam || !firstMember) continue;
    const logId = await claim(`daily:${u.id}:${today}`, { teamId: firstTeam, memberId: firstMember, taskId: null, kind: "daily", recipient: u.email });
    if (!logId) continue;
    const mail = dailyDigestEmail({ name: u.name, items, settingsUrl: `${app()}/settings#buzz` });
    if (await deliver(logId, u.email, `Your Buzz for today: ${items.length} ${items.length === 1 ? "thing" : "things"}`, mail, mail.text, null)) {
      sent++;
      if (notify.length) await db.update(assignment).set({ notifiedAt: now }).where(inArray(assignment.id, notify));
    }
  }
  return sent;
}

/** "Need help" from an email: posts on the team's Comb and emails the leader (once a day per part). */
export async function askForHelp(assignmentId: string, now = new Date()) {
  const r = await loadAssignment(assignmentId);
  if (!r) return null;
  const title = r.t.title || "Untitled task";
  const [leader] = await db.select().from(teamMember).where(and(eq(teamMember.teamId, r.team.id), eq(teamMember.isAdmin, true)));
  const logId = leader ? await claim(`help:${assignmentId}:${utcToZoned(now, r.owner.tz).date}`, { teamId: r.team.id, memberId: leader.id, taskId: r.t.id, kind: "help", recipient: leader.email }) : null;
  if (!logId) return { title, team: r.team.name, already: true };
  await db.insert(combPost).values({ teamId: r.team.id, memberId: r.m.id, body: `I need help with “${title}”. Can someone give me a hand?` });
  const mail = helpEmail({ leader: leader.name, who: r.m.nickname?.trim() || r.m.name, task: title, team: r.team.name, url: `${app()}/tasks/${r.t.id}` });
  await deliver(logId, leader.email, `${r.m.name} needs help with ${title}`, mail, mail.text, null);
  return { title, team: r.team.name, already: false };
}

/** "Snooze" from an email: no reminders for this part for a day. The due date doesn't move. */
export async function snoozePart(assignmentId: string, now = new Date()) {
  const r = await loadAssignment(assignmentId);
  if (!r) return null;
  const until = new Date(now.getTime() + DAY);
  await db.update(assignment).set({ snoozedUntil: until }).where(eq(assignment.id, assignmentId));
  return { title: r.t.title || "Untitled task", team: r.team.name, until };
}
