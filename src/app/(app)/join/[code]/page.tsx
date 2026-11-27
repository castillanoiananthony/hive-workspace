import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { HexBadge } from "@/components/app/HexBadge";
import { db } from "@/db";
import { team, teamMember } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and } from "drizzle-orm";
import { JoinButton } from "./JoinButton";

export const metadata: Metadata = { title: "Join a team" };

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Suspense fallback={<HoneyLoader label="Opening the invite…" />}>
        <Join params={params} />
      </Suspense>
    </main>
  );
}

async function Join({ params }: { params: PageProps<"/join/[code]">["params"] }) {
  const { code } = await params;
  const me = await requireUser();
  const [t] = await db.select().from(team).where(eq(team.joinCode, code));
  if (!t) return (<div className="rounded-[var(--radius)] border border-line bg-surface p-6 text-center"><h1 className="font-display text-2xl font-semibold">This join link doesn&apos;t work any more</h1><p className="mt-2 text-muted">Ask the team for a new link.</p></div>);
  const [already] = await db.select({ id: teamMember.id }).from(teamMember).where(and(eq(teamMember.teamId, t.id), eq(teamMember.userId, me.id)));
  if (already) redirect(`/hive/${t.id}`);
  return (
    <div className="grid justify-items-center gap-4 rounded-[var(--radius)] border border-line bg-surface p-8 text-center">
      <HexBadge label={t.name} color={t.color} size={72} />
      <h1 className="font-display text-2xl font-semibold">Join {t.name}?</h1>
      <p className="text-muted">You&apos;ll see the team&apos;s tasks, The Comb and the hierarchy, and get reminders for tasks assigned to you.</p>
      <JoinButton code={code} team={t.name} />
    </div>
  );
}
