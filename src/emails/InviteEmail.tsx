import { Heading, Text } from "@react-email/components";
import { Button, C, Layout } from "./Layout";

export type InviteProps = { app: string; team: string; teamColor: string; inviter: string; memberName: string; hasAccount: boolean; url: string; unsubscribeUrl: string };

export function InviteEmail(p: InviteProps) {
  const first = p.memberName.split(" ")[0];
  return (
    <Layout preview={`${p.inviter} added you to ${p.team}`} team={p.team} teamColor={p.teamColor} app={p.app} unsubscribeUrl={p.unsubscribeUrl} ownerName={p.inviter}>
      <Text className="muted" style={{ margin: "0 0 6px", fontSize: 14, color: C.muted }}>Hi {first},</Text>
      <Heading as="h1" className="ink" style={{ margin: "0 0 10px", fontSize: 22, lineHeight: "28px", color: C.ink }}>{p.inviter} added you to {p.team}</Heading>
      <Text className="ink" style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: C.ink }}>
        {p.hasAccount
          ? "It's already in The Hive on your account: open it to see the team's tasks, The Comb and who's doing what."
          : `HIVE-WORKSPACE keeps the team's tasks and reminders in one place. Sign up with this email address (${"it's free"}) and you'll land straight in ${p.team}. Until then, task emails still reach you here.`}
      </Text>
      <Button href={p.url}>{p.hasAccount ? `Open ${p.team}` : `Join ${p.team}`}</Button>
    </Layout>
  );
}

export const inviteText = (p: InviteProps) =>
  `${p.inviter} added you to ${p.team} on HIVE-WORKSPACE.\n\n${p.hasAccount ? "Open the team" : "Sign up with this email address to join"}: ${p.url}\n\nStop emails from ${p.team}: ${p.unsubscribeUrl}`;
