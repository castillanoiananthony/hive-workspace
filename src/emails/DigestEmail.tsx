import { Heading, Link, Text } from "@react-email/components";
import { C, Divider, Layout } from "./Layout";

type Item = { title: string; due: string | null; mine: boolean; doneUrl: string | null };
export type DigestProps = { app: string; team: string; teamColor: string; ownerName: string; memberName: string; overdue: Item[]; thisWeek: Item[]; later: Item[]; unsubscribeUrl: string };

function List({ label, items, color }: { label: string; items: Item[]; color?: string }) {
  if (!items.length) return null;
  return (<>
    <Divider />
    <Text style={{ margin: "0 0 8px", fontSize: 15, fontWeight: "bold", color: color ?? C.ink }} className={color ? undefined : "ink"}>{label} ({items.length})</Text>
    {items.map((t, i) => (
      <Text key={i} className="ink" style={{ margin: "0 0 8px", fontSize: 15, lineHeight: "21px", color: C.ink }}>
        {t.mine ? "★ " : ""}{t.title || "Untitled task"}{t.due ? <span className="muted" style={{ color: C.muted }}>, due {t.due}</span> : null}
        {t.doneUrl && <>. <Link href={t.doneUrl} style={{ color: C.honeyText, textDecoration: "underline" }}>Mark mine done</Link></>}
      </Text>
    ))}
  </>);
}

export function DigestEmail(p: DigestProps) {
  const open = p.overdue.length + p.thisWeek.length + p.later.length;
  return (
    <Layout preview={`${p.team} this week: ${p.overdue.length} overdue, ${p.thisWeek.length} due this week`} team={p.team} teamColor={p.teamColor} app={p.app} unsubscribeUrl={p.unsubscribeUrl} ownerName={p.ownerName}>
      <Text className="muted" style={{ margin: "0 0 6px", fontSize: 14, color: C.muted }}>Hi {p.memberName.split(" ")[0]}, here&apos;s your weekly summary.</Text>
      <Heading as="h1" className="ink" style={{ margin: "0 0 4px", fontSize: 22, color: C.ink }}>{p.team} this week</Heading>
      <Text className="muted" style={{ margin: 0, fontSize: 14, color: C.muted }}>{open} open {open === 1 ? "task" : "tasks"}. ★ marks the ones assigned to you.</Text>
      <List label="Overdue" items={p.overdue} color={C.danger} />
      <List label="Due this week" items={p.thisWeek} />
      <List label="Later or no date" items={p.later} />
    </Layout>
  );
}

export function digestText(p: DigestProps) {
  const sec = (l: string, xs: Item[]) => (xs.length ? `\n${l}:\n${xs.map((t) => `- ${t.mine ? "(yours) " : ""}${t.title}${t.due ? `, due ${t.due}` : ""}${t.doneUrl ? `\n  Mark done: ${t.doneUrl}` : ""}`).join("\n")}` : "");
  return `Hi ${p.memberName.split(" ")[0]}, here's ${p.team} this week.\n${sec("Overdue", p.overdue)}${sec("Due this week", p.thisWeek)}${sec("Later or no date", p.later)}\n\nStop emails from ${p.team}: ${p.unsubscribeUrl}`;
}
