import type { Metadata } from "next";
import { Suspense } from "react";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { PublicCard } from "@/components/app/PublicCard";
import { BuzzAction } from "./BuzzAction";

export const metadata: Metadata = { title: "Buzz", robots: { index: false, follow: false } };

// Snooze / Need help links from Buzz emails. No sign-in: the signed link is the proof. Nothing happens until the button is pressed.
export default function BuzzPage({ params, searchParams }: PageProps<"/buzz/[action]">) {
  return (
    <PublicCard>
      <Suspense fallback={<HoneyLoader label="Loading…" />}><Body params={params} searchParams={searchParams} /></Suspense>
    </PublicCard>
  );
}

async function Body({ params, searchParams }: { params: PageProps<"/buzz/[action]">["params"]; searchParams: PageProps<"/buzz/[action]">["searchParams"] }) {
  const { action } = await params;
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <BuzzAction action={action} a={one(q.a)} t={one(q.t)} />;
}
