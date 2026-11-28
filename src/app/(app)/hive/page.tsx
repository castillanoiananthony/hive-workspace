import type { Metadata } from "next";
import { and, count, eq, isNotNull, ne, or } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { HexBadge } from "@/components/app/HexBadge";
import { db } from "@/db";
import { colony, colonyMember, task, team, teamMember, user } from "@/db/schema";
import { ClassButtons } from "../colony/ClassButtons";
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
  const all = await db.select().from(team).where(inMyTeams(me.id)).orderBy(team.createdAt);
  const teams = all.filter((t) => !t.archivedAt), archived = all.filter((t) => t.archivedAt);
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
      <Classes userId={me.id} />
      <h2 className="font-display mt-10 text-xl font-semibold">Teams</h2>
      <div className="mt-4">
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
      {archived.length > 0 && (
        <details className="mt-10">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">Archived ({archived.length})</summary>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((t) => (
              <li key={t.id}><Link href={`/hive/${t.id}`} className="flex items-center gap-3 rounded-[var(--radius)] border border-line p-4 opacity-80 hover:border-accent-edge hover:opacity-100"><HexBadge label={t.name} color={t.color} size={40} /><span className="min-w-0"><span className="block truncate font-semibold">{t.name}</span><span className="block text-sm text-muted">Archived, read-only</span></span></Link></li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

/** Classes you run (Queen Bee) or take (student). */
async function Classes({ userId }: { userId: string }) {
  const rows = await db.selectDistinct({ id: colony.id, name: colony.name, queenId: colony.queenId, queen: user.name }).from(colony)
    .innerJoin(user, eq(colony.queenId, user.id)).leftJoin(colonyMember, eq(colonyMember.colonyId, colony.id))
    .where(or(eq(colony.queenId, userId), eq(colonyMember.userId, userId))).orderBy(colony.name);
  return (
    <section aria-labelledby="classes-h" className="mt-8 rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="classes-h" className="font-display text-xl font-semibold">Classes</h2>
          <p className="text-sm text-muted">Join your teacher&apos;s class with a code, or run one as its Queen Bee.</p>
        </div>
        <ClassButtons />
      </div>
      {rows.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/colony/${c.id}`} className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-bg/40 p-4 hover:border-accent-edge">
                <HexBadge label={c.name} color="#F5B80B" size={44} />
                <span className="min-w-0"><span className="block truncate font-semibold">{c.name}</span><span className="block text-sm text-muted">{c.queenId === userId ? "You're the Queen Bee" : `Queen Bee: ${c.queen}`}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
