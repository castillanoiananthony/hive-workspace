import { Heading, Link, Text } from "@react-email/components";
import { Button, C, Divider, Layout } from "./Layout";

export type TaskEmailProps = {
  kind: "assign" | "remind3" | "remind1" | "remind0";
  app: string; team: string; teamColor: string; ownerName: string; memberName: string;
  title: string; due: string | null; howToHtml: string; links: { title: string; url: string }[]; checklist: string[];
  doneUrl: string; unsubscribeUrl: string;
  snoozeUrl?: string; helpUrl?: string; // reminders: push reminders back a day / tell the leader you're stuck
  whenText?: string; // reminders: "due in 3 days", "due tomorrow", "due today"
};

const head = (p: TaskEmailProps) => (p.kind === "assign" ? `${p.ownerName} assigned you a task` : `Reminder: ${p.whenText ?? "due soon"}`);

/** Assignment email and both reminders share one layout; only the opening line changes. */
export function TaskEmail(p: TaskEmailProps) {
  const first = p.memberName.split(" ")[0];
  return (
    <Layout preview={`${head(p)}: ${p.title}${p.due ? `, due ${p.due}` : ""}`} team={p.team} teamColor={p.teamColor} app={p.app} unsubscribeUrl={p.unsubscribeUrl} ownerName={p.ownerName}>
      <Text className="muted" style={{ margin: "0 0 6px", fontSize: 14, color: p.kind === "remind1" || p.kind === "remind0" ? C.danger : C.muted }}>
        Hi {first}, {p.kind === "assign" ? `${p.ownerName} assigned you this in ${p.team}.` : `a friendly reminder: this is ${p.whenText ?? "due soon"}.`}
      </Text>
      <Heading as="h1" className="ink" style={{ margin: "0 0 6px", fontSize: 22, lineHeight: "28px", color: C.ink }}>{p.title || "Untitled task"}</Heading>
      {p.due && <Text className="ink" style={{ margin: 0, fontSize: 15, color: C.ink }}><strong>Due:</strong> {p.due}</Text>}
      <Button href={p.doneUrl}>Mark done</Button>
      <Text className="muted" style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>One click, no sign-in. You can undo it on the next page.</Text>
      {(p.snoozeUrl || p.helpUrl) && (
        <Text style={{ margin: "10px 0 0", fontSize: 14 }}>
          {p.snoozeUrl && <Link href={p.snoozeUrl} style={{ color: C.honeyText, textDecoration: "underline", marginRight: 16 }}>Snooze reminders a day</Link>}
          {p.helpUrl && <Link href={p.helpUrl} style={{ color: C.honeyText, textDecoration: "underline" }}>I need help with this</Link>}
        </Text>
      )}

      {p.howToHtml && (<>
        <Divider />
        <Text className="ink" style={{ margin: "0 0 8px", fontSize: 15, fontWeight: "bold", color: C.ink }}>How to do it</Text>
        <div className="ink" style={{ fontSize: 15, lineHeight: "22px", color: C.ink }} dangerouslySetInnerHTML={{ __html: p.howToHtml }} />
      </>)}

      {p.checklist.length > 0 && (<>
        <Divider />
        <Text className="ink" style={{ margin: "0 0 8px", fontSize: 15, fontWeight: "bold", color: C.ink }}>Checklist</Text>
        {p.checklist.map((c, i) => <Text key={i} className="ink" style={{ margin: "0 0 6px", fontSize: 15, color: C.ink }}>☐ {c}</Text>)}
      </>)}

      {p.links.length > 0 && (<>
        <Divider />
        <Text className="ink" style={{ margin: "0 0 8px", fontSize: 15, fontWeight: "bold", color: C.ink }}>Links</Text>
        {p.links.map((l, i) => <Text key={i} style={{ margin: "0 0 6px", fontSize: 15 }}><Link href={l.url} style={{ color: C.honeyText, textDecoration: "underline" }}>{l.title}</Link></Text>)}
      </>)}
    </Layout>
  );
}

export function taskEmailText(p: TaskEmailProps, howToText: string) {
  const lead = p.kind === "assign" ? `${p.ownerName} assigned you a task in ${p.team}.` : `Reminder: this is ${p.whenText ?? "due soon"}.`;
  return [
    `Hi ${p.memberName.split(" ")[0]}, ${lead}`, "", p.title || "Untitled task", p.due ? `Due: ${p.due}` : "", "",
    `Mark done (one click, no sign-in): ${p.doneUrl}`,
    p.snoozeUrl ? `Snooze reminders a day: ${p.snoozeUrl}` : "", p.helpUrl ? `I need help with this: ${p.helpUrl}` : "",
    howToText ? `\nHow to do it:\n${howToText}` : "",
    p.checklist.length ? `\nChecklist:\n${p.checklist.map((c) => `- ${c}`).join("\n")}` : "",
    p.links.length ? `\nLinks:\n${p.links.map((l) => `${l.title}: ${l.url}`).join("\n")}` : "",
    "", `Stop emails from ${p.team}: ${p.unsubscribeUrl}`,
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
