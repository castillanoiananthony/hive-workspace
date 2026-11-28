import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "HIVE-WORKSPACE <hello@hive-workspace.com>";

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) throw new Error(`Email to ${to} failed: ${error.message}`);
  return data?.id;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// shortcut: plain table-based HTML; Phase 5 moves all emails to React Email with the branded header
export function signInEmail(url: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#17171A;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#1F2024;border:1px solid #36373D;border-radius:10px" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;color:#EDEBE6;font-size:15px;font-weight:bold;letter-spacing:.02em">HIVE-WORKSPACE</p>
<h1 style="margin:0 0 12px;color:#EDEBE6;font-size:22px">Your sign-in link</h1>
<p style="margin:0 0 24px;color:#A3A2AA;font-size:15px;line-height:1.5">Click the button to sign in. The link works once and expires in 5 minutes.</p>
<a href="${esc(url)}" style="display:inline-block;background:#F5B80B;color:#17171A;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Sign in to HIVE-WORKSPACE</a>
<p style="margin:24px 0 0;color:#A3A2AA;font-size:13px;line-height:1.5">Didn&rsquo;t ask for this? You can ignore this email; nobody can sign in without the link.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `Sign in to HIVE-WORKSPACE:\n${url}\n\nThe link works once and expires in 5 minutes. Didn't ask for this? Ignore this email.`;
  return { html, text };
}

/** A Queen Bee's class announcement, sent to each student through Buzz. */
export function announcementEmail(p: { className: string; body: string; url: string; unsubscribeUrl: string | null }) {
  const html = `<!doctype html><html><body style="margin:0;background:#17171A;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#1F2024;border:1px solid #36373D;border-radius:10px" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;color:#EDEBE6;font-size:15px;font-weight:bold;letter-spacing:.02em">HIVE-WORKSPACE</p>
<p style="margin:0 0 6px;color:#A3A2AA;font-size:14px">Announcement in ${esc(p.className)}</p>
<div style="margin:0 0 24px;color:#EDEBE6;font-size:16px;line-height:1.6;white-space:pre-line">${esc(p.body)}</div>
<a href="${esc(p.url)}" style="display:inline-block;background:#F5B80B;color:#17171A;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Open the class</a>
${p.unsubscribeUrl ? `<p style="margin:24px 0 0;color:#A3A2AA;font-size:12px">Don&rsquo;t want Buzz emails? <a href="${esc(p.unsubscribeUrl)}" style="color:#A3A2AA">Turn them off</a>.</p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = `Announcement in ${p.className}\n\n${p.body}\n\nOpen the class: ${p.url}${p.unsubscribeUrl ? `\n\nTurn off Buzz emails: ${p.unsubscribeUrl}` : ""}`;
  return { html, text };
}

const shell = (inner: string) => `<!doctype html><html><body style="margin:0;background:#17171A;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#1F2024;border:1px solid #36373D;border-radius:10px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px">
<p style="margin:0 0 20px;color:#EDEBE6;font-size:15px;font-weight:bold;letter-spacing:.02em">HIVE-WORKSPACE</p>${inner}
</td></tr></table></td></tr></table></body></html>`;
const btn = (href: string, label: string, primary = false) => `<a href="${esc(href)}" style="display:inline-block;margin:6px 6px 0 0;${primary ? "background:#F5B80B;color:#17171A" : "border:1px solid #4A4B52;color:#EDEBE6"};text-decoration:none;font-weight:bold;font-size:14px;padding:9px 14px;border-radius:8px">${label}</a>`;

export type DailyItem = { kind: "new" | "due" | "subtask" | "announce"; title: string; context: string; when: string | null; doneUrl?: string; snoozeUrl?: string; helpUrl?: string; openUrl: string };

/** One email a day with everything Buzz would otherwise have sent separately. */
export function dailyDigestEmail(p: { name: string; items: DailyItem[]; settingsUrl: string }) {
  const groups: [DailyItem["kind"], string][] = [["new", "New for you"], ["due", "Due soon"], ["subtask", "Your subtasks"], ["announce", "Class announcements"]];
  const block = (it: DailyItem) => `<div style="margin:0 0 14px;padding:14px;border:1px solid #36373D;border-radius:8px">
<p style="margin:0;color:#EDEBE6;font-size:15px;font-weight:bold">${esc(it.title)}</p>
<p style="margin:4px 0 0;color:#A3A2AA;font-size:13px">${esc(it.context)}${it.when ? `, ${esc(it.when)}` : ""}</p>
${it.doneUrl ? btn(it.doneUrl, "Mark done", true) : btn(it.openUrl, "Open", true)}${it.snoozeUrl ? btn(it.snoozeUrl, "Snooze a day") : ""}${it.helpUrl ? btn(it.helpUrl, "Need help") : ""}</div>`;
  const html = shell(`<h1 style="margin:0 0 6px;color:#EDEBE6;font-size:22px">Your Buzz for today</h1>
<p style="margin:0 0 20px;color:#A3A2AA;font-size:15px">Hi ${esc(p.name.split(" ")[0] || "there")}, here's everything in one place.</p>
${groups.map(([k, label]) => { const xs = p.items.filter((i) => i.kind === k); return xs.length ? `<p style="margin:18px 0 8px;color:#F5B80B;font-size:14px;font-weight:bold">${label}</p>${xs.map(block).join("")}` : ""; }).join("")}
<p style="margin:24px 0 0;color:#A3A2AA;font-size:12px">You get one Buzz email a day. <a href="${esc(p.settingsUrl)}" style="color:#A3A2AA">Change this in Settings</a>.</p>`);
  const text = [`Your Buzz for today`, "", ...p.items.map((i) => `- ${i.title} (${i.context}${i.when ? `, ${i.when}` : ""})${i.doneUrl ? `\n  Mark done: ${i.doneUrl}` : `\n  Open: ${i.openUrl}`}`), "", `Change how Buzz emails you: ${p.settingsUrl}`].join("\n");
  return { html, text };
}

/** A reminder for the one owner of a subtask. */
export function subtaskEmail(p: { name: string; title: string; task: string; team: string; when: string; url: string; settingsUrl: string }) {
  const html = shell(`<p style="margin:0 0 6px;color:${p.when === "due today" ? "#E8847A" : "#A3A2AA"};font-size:14px">Hi ${esc(p.name.split(" ")[0] || "there")}, your subtask is ${esc(p.when)}.</p>
<h1 style="margin:0 0 6px;color:#EDEBE6;font-size:22px">${esc(p.title)}</h1>
<p style="margin:0 0 16px;color:#A3A2AA;font-size:14px">Part of “${esc(p.task)}” in ${esc(p.team)}</p>${btn(p.url, "Open and tick it off", true)}
<p style="margin:24px 0 0;color:#A3A2AA;font-size:12px"><a href="${esc(p.settingsUrl)}" style="color:#A3A2AA">Choose instant, daily or no Buzz emails</a>.</p>`);
  return { html, text: `Your subtask "${p.title}" (part of "${p.task}", ${p.team}) is ${p.when}.\nOpen it: ${p.url}\n\nBuzz settings: ${p.settingsUrl}` };
}

/** Tells a team leader that someone asked for help from an email. */
export function helpEmail(p: { leader: string; who: string; task: string; team: string; url: string }) {
  const html = shell(`<h1 style="margin:0 0 8px;color:#EDEBE6;font-size:22px">${esc(p.who)} needs help</h1>
<p style="margin:0 0 16px;color:#A3A2AA;font-size:15px;line-height:1.5">Hi ${esc(p.leader.split(" ")[0] || "there")}, ${esc(p.who)} asked for help with “${esc(p.task)}” in ${esc(p.team)}. It's also posted on the team's Comb.</p>${btn(p.url, "Open the task", true)}`);
  return { html, text: `${p.who} asked for help with "${p.task}" in ${p.team}.\nOpen the task: ${p.url}` };
}
