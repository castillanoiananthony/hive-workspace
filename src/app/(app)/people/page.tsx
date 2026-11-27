import type { Metadata } from "next";
import { and, desc, eq, ilike, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { follow, teamMember, user } from "@/db/schema";
import { avatarsFor } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { PersonRow, type PersonT } from "./PersonRow";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage({ searchParams }: PageProps<"/people">) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/home" />
      <h1 className="font-display text-3xl font-semibold">People</h1>
      <p className="mt-1 text-muted">Find classmates and teammates, visit their profiles and follow them.</p>
      <Suspense fallback={<HoneyLoader label="Finding people…" />}>
        <People searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function People({ searchParams }: { searchParams: PageProps<"/people">["searchParams"] }) {
  const me = await requireUser();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 60);
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const cols = { id: user.id, name: user.name, bio: user.bio };
  const myTeams = db.select({ teamId: teamMember.teamId }).from(teamMember).where(eq(teamMember.userId, me.id));
  // with a search: name matches (never email, so addresses stay private). Without: your teammates, then the newest people.
  const rows = q
    ? await db.select(cols).from(user).where(and(isNotNull(user.onboardedAt), ilike(user.name, like))).orderBy(user.name).limit(40)
    : await db.selectDistinct(cols).from(user).innerJoin(teamMember, eq(teamMember.userId, user.id))
        .where(and(inArray(teamMember.teamId, myTeams), ne(user.id, me.id))).orderBy(user.name).limit(40);
  const newest = q ? [] : await db.select(cols).from(user).where(and(isNotNull(user.onboardedAt), ne(user.id, me.id))).orderBy(desc(user.createdAt)).limit(12);
  const ids = [...new Set([...rows, ...newest].map((r) => r.id))];
  const [avatars, mine] = await Promise.all([
    avatarsFor(ids),
    ids.length ? db.select({ id: follow.followingId }).from(follow).where(and(eq(follow.followerId, me.id), inArray(follow.followingId, ids))) : Promise.resolve([]),
  ]);
  const followed = new Set(mine.map((f) => f.id));
  const toPerson = (r: { id: string; name: string; bio: string | null }): PersonT => ({ ...r, avatar: avatars.get(r.id) ?? null, following: followed.has(r.id), isMe: r.id === me.id });
  const [counts] = await db.select({
    following: sql<number>`(select count(*)::int from ${follow} where ${follow.followerId} = ${me.id})`,
    followers: sql<number>`(select count(*)::int from ${follow} where ${follow.followingId} = ${me.id})`,
  }).from(user).where(eq(user.id, me.id));
  const list = "mt-3 divide-y divide-line rounded-[calc(var(--radius)*2)] border border-line bg-surface";
  return (
    <>
      <form role="search" className="mt-6 flex gap-2" action="/people">
        <label htmlFor="people-q" className="sr-only">Search people by name</label>
        <input id="people-q" name="q" type="search" defaultValue={q} placeholder="Search by name" autoComplete="off"
          className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-base placeholder:text-muted focus:border-accent-edge" />
        <button className="min-h-12 rounded-full bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">Search</button>
      </form>
      <p className="mt-3 text-sm text-muted">You follow {counts.following} {counts.following === 1 ? "person" : "people"}. {counts.followers} {counts.followers === 1 ? "follows" : "follow"} you.</p>
      {q ? (
        <section aria-labelledby="results-h" className="mt-8">
          <h2 id="results-h" className="font-display text-xl font-semibold">{rows.length ? `People named “${q}”` : `Nobody named “${q}” yet`}</h2>
          {rows.length > 0 && <ul className={list}>{rows.map((r) => <PersonRow key={r.id} p={toPerson(r)} />)}</ul>}
        </section>
      ) : (
        <>
          {rows.length > 0 && (
            <section aria-labelledby="mates-h" className="mt-8">
              <h2 id="mates-h" className="font-display text-xl font-semibold">From your teams</h2>
              <ul className={list}>{rows.map((r) => <PersonRow key={r.id} p={toPerson(r)} />)}</ul>
            </section>
          )}
          <section aria-labelledby="new-h" className="mt-8">
            <h2 id="new-h" className="font-display text-xl font-semibold">New on HIVE-WORKSPACE</h2>
            {newest.length ? <ul className={list}>{newest.map((r) => <PersonRow key={r.id} p={toPerson(r)} />)}</ul> : <p className="mt-2 text-muted">Nobody else yet. Invite your classmates!</p>}
          </section>
        </>
      )}
    </>
  );
}
