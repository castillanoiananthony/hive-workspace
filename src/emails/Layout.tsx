import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";

// Light card with dark text and a honey button: survives Gmail/Outlook dark-mode inversion better than a dark design.
export const C = { ink: "#17171A", muted: "#5C5B63", line: "#E6E4DE", bg: "#F3F3F1", card: "#FFFFFF", honey: "#F5B80B", honeyText: "#8A5A00", danger: "#B3362B" };

export function Layout({ preview, team, teamColor, app, unsubscribeUrl, ownerName, children }: {
  preview: string; team: string; teamColor: string; app: string; unsubscribeUrl: string; ownerName: string; children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        {/* light only: Apple Mail then keeps these colours, and Gmail/Outlook's automatic dark mode inverts a light design cleanly */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body className="bg" style={{ backgroundColor: C.bg, margin: 0, padding: "24px 12px", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto" }}>
          <Section style={{ padding: "0 4px 12px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0}><tbody><tr>
              <td style={{ verticalAlign: "middle" }}><Img src={`${app}/email/hexley-fly.png`} width="44" height="44" alt="Hexley the bee" /></td>
              <td style={{ verticalAlign: "middle", paddingLeft: 8 }}>
                <Text className="ink" style={{ margin: 0, fontSize: 14, fontWeight: "bold", letterSpacing: "0.02em", color: C.ink }}>HIVE-WORKSPACE</Text>
                <Text className="muted" style={{ margin: 0, fontSize: 13, color: C.muted }}>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, backgroundColor: teamColor, marginRight: 6 }} />
                  {team}
                </Text>
              </td>
            </tr></tbody></table>
          </Section>
          <Section className="card" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "28px 28px 24px" }}>
            {children}
          </Section>
          <Text className="muted" style={{ fontSize: 12, lineHeight: "18px", color: C.muted, padding: "12px 4px 0", margin: 0 }}>
            You get these because {ownerName} added you to {team}. You don&apos;t need an account.{" "}
            <Link href={unsubscribeUrl} style={{ color: C.muted, textDecoration: "underline" }}>Stop emails from {team}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Button({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "20px 0 4px" }}><tbody><tr>
      <td style={{ backgroundColor: C.honey, borderRadius: 8 }}>
        <Link href={href} style={{ display: "inline-block", padding: "13px 24px", color: C.ink, fontWeight: "bold", fontSize: 16, textDecoration: "none" }}>{children}</Link>
      </td>
    </tr></tbody></table>
  );
}

export const Divider = () => <Hr style={{ borderColor: C.line, margin: "20px 0" }} />;
