import type { Metadata } from "next";
import { and, count, isNotNull, ne } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { HexBadge } from "@/components/app/HexBadge";
import { db } from "@/db";
import { task, team, teamMember } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { inMyTeams } from "@/lib/team-sql";
import { NewTeamButton } from "./NewTeam";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { BackButton } from "@/components/app/BackButton";

export const metadata: Metadata = { title: "The Hive" };

export default function HivePage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/home" />
      <Suspense fallback={<HoneyLoader label="Loading your teams…" />}>
        <Teams />
      </Suspense>
    </main>
  );
}

async function Teams() {
  const me = await requireUser();
  const teams = await db.select().from(team).where(inMyTeams(me.id)).orderBy(team.createdAt);
  const [members, open] = await Promise.all([
    db.select({ teamId: teamMember.teamId, n: count() }).from(teamMember).groupBy(teamMember.teamId),
    db.select({ teamId: task.teamId, n: count() }).from(task).where(and(isNotNull(task.teamId), ne(task.status, "done"))).groupBy(task.teamId),
  ]);
  const n = (rows: { teamId: string | null; n: number }[], id: string) => rows.find((r) => r.teamId === id)?.n ?? 0;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">The Hive</h1>
          <p className="mt-1 text-muted">Your teams. Invite people by email or with a join link; HIVE-WORKSPACE sends the reminders.</p>
        </div>
        <NewTeamButton />
      </div>
      <div className="mt-8">
        {teams.length === 0 ? (
          <EmptyState pose="idle" title="No teams yet" body="Make a team for a group project or an org, invite everyone by email or with a join link, and assign tasks." action={<NewTeamButton />} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((t) => (
              <li key={t.id}>
                <Link href={`/hive/${t.id}`} className="flex items-center gap-4 rounded-[var(--radius)] border border-line bg-surface p-5 hover:border-accent-edge">
                  <HexBadge label={t.name} color={t.color} size={52} />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-semibold">{t.name}</span>
                    <span className="block text-sm text-muted">{n(members, t.id)} {n(members, t.id) === 1 ? "member" : "members"}, {n(open, t.id)} open {n(open, t.id) === 1 ? "task" : "tasks"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
