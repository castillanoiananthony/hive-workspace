import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicCard } from "@/components/app/PublicCard";
import { DoneClient } from "./DoneClient";

export const metadata: Metadata = { title: "Mark done", robots: { index: false, follow: false } };

export default function DonePage({ params }: PageProps<"/done/[token]">) {
  return (
    <PublicCard>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Body params={params} />
      </Suspense>
    </PublicCard>
  );
}

async function Body({ params }: { params: PageProps<"/done/[token]">["params"] }) {
  return <DoneClient token={(await params).token} />;
}
