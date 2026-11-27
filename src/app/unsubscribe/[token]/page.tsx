import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicCard } from "@/components/app/PublicCard";
import { findMember } from "@/lib/teammate";
import { UnsubscribeClient } from "./UnsubscribeClient";

export const metadata: Metadata = { title: "Email settings", robots: { index: false, follow: false } };

export default function UnsubscribePage({ params }: PageProps<"/unsubscribe/[token]">) {
  return (
    <PublicCard>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Body params={params} />
      </Suspense>
    </PublicCard>
  );
}

async function Body({ params }: { params: PageProps<"/unsubscribe/[token]">["params"] }) {
  const { token } = await params;
  const r = await findMember(token);
  if (!r) return (<><h1 className="font-display text-2xl font-semibold">This link doesn&apos;t work any more</h1><p className="mt-2 text-muted">You may have been removed from the team, so no more emails will come.</p></>);
  return <UnsubscribeClient token={token} team={r.team} initiallySubscribed={!r.m.unsubscribedAt} />;
}
