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
