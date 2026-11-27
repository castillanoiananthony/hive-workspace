import type { Metadata } from "next";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { colonyMember, colonyPost, contribution, milestone, peerEval, peerResponse, team, teamMember, user } from "@/db/schema";
import { colonyAccess, swarmOf, swarmStats } from "@/lib/colony";
import { isPast } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { QueenView, StudentView } from "./ColonyViews";

export const metadata: Metadata = { title: "Class" };

export default function ColonyPage({ params }: PageProps<"/colony/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/hive" />
      <Suspense fallback={<HoneyLoader label="Loading the class…" />}><Colony params={params} /></Suspense>
    </main>
  );
}

async function Colony({ params }: { params: PageProps<"/colony/[id]">["params"] }) {
  const { id } = await params;
  const me = await requireUser();
  const a = await colonyAccess(me.id, id).catch(() => null);
  if (!a) notFound();
  const c = a.colony;
  const fmt = (d: Date, time = false) => new Intl.DateTimeFormat("en", { timeZone: me.timezone, weekday: "short", month: "short", day: "numeric", ...(time ? { hour: "numeric", minute: "2-digit" } : {}) }).format(d);
  const [milestones, posts, evals, [queen]] = await Promise.all([
    db.select().from(milestone).where(eq(milestone.colonyId, id)).orderBy(asc(milestone.dueAt)),
    db.select().from(colonyPost).where(eq(colonyPost.colonyId, id)).orderBy(desc(colonyPost.createdAt)).limit(20),
    db.select().from(peerEval).where(eq(peerEval.colonyId, id)).orderBy(desc(peerEval.createdAt)),
    db.select({ name: user.name }).from(user).where(eq(user.id, c.queenId)),
  ]);
  const ms = milestones.map((m) => ({ id: m.id, title: m.title, when: fmt(m.dueAt), past: isPast(m.dueAt) }));
  const ps = posts.map((p) => ({ id: p.id, body: p.body, when: fmt(p.createdAt, true) }));
  const base = { id, name: c.name, queen: queen?.name ?? "Your teacher", selfSwarm: c.selfSwarm, milestones: ms, posts: ps };

  if (a.isQueen) {
    const [stats, students, swarmMembers] = await Promise.all([
      swarmStats(id),
      db.select({ id: user.id, name: user.name, email: user.email }).from(colonyMember).innerJoin(user, eq(colonyMember.userId, user.id)).where(eq(colonyMember.colonyId, id)).orderBy(asc(user.name)),
      db.select({ id: teamMember.id, teamId: teamMember.teamId, userId: teamMember.userId, name: teamMember.name, isAdmin: teamMember.isAdmin })
        .from(teamMember).innerJoin(team, eq(teamMember.teamId, team.id)).where(and(eq(team.colonyId, id), eq(teamMember.access, "member"))),
    ]);
    const teamIds = stats.map((s) => s.id);
    const [responses, contribs] = await Promise.all([
      evals.length ? db.select().from(peerResponse).where(inArray(peerResponse.evalId, evals.map((e) => e.id))) : Promise.resolve([]),
      teamIds.length ? db.select({ memberId: contribution.memberId }).from(contribution).where(and(inArray(contribution.teamId, teamIds), ne(contribution.kind, "sent_for_review"))) : Promise.resolve([]),
    ]);
    return (
      <QueenView {...base} code={c.joinCode}
        swarms={stats.map((s) => ({ ...s, lastActivity: s.lastActivity ? fmt(s.lastActivity) : null, members: swarmMembers.filter((m) => m.teamId === s.id).map((m) => ({ id: m.id, name: m.name, leader: m.isAdmin, done: contribs.filter((x) => x.memberId === m.id).length })) }))}
        students={students.map((s) => ({ ...s, swarm: stats.find((t) => swarmMembers.some((m) => m.teamId === t.id && m.userId === s.id))?.name ?? null }))}
        evals={evals.map((e) => ({ id: e.id, title: e.title, criteria: e.criteria, open: e.open, showToStudents: e.showToStudents,
          responses: responses.filter((r) => r.evalId === e.id).map((r) => ({ teamId: r.teamId, rateeId: r.rateeId, scores: r.scores, comment: r.comment })) }))}
      />
    );
  }

  const sw = await swarmOf(me.id, id);
  const [mates, openSwarms, myResponses] = await Promise.all([
    sw ? db.select({ id: teamMember.id, userId: teamMember.userId, name: teamMember.name }).from(teamMember).where(and(eq(teamMember.teamId, sw.id), eq(teamMember.access, "member"))).orderBy(asc(teamMember.name)) : Promise.resolve([]),
    !sw && c.selfSwarm ? swarmStats(id) : Promise.resolve([]),
    evals.length ? db.select().from(peerResponse).where(and(inArray(peerResponse.evalId, evals.map((e) => e.id)), eq(peerResponse.raterId, me.id))) : Promise.resolve([]),
  ]);
  const myMember = mates.find((m) => m.userId === me.id);
  const aboutMe = myMember && evals.some((e) => e.showToStudents) ? await db.select().from(peerResponse).where(eq(peerResponse.rateeId, myMember.id)) : [];
  return (
    <StudentView {...base}
      swarm={sw && { id: sw.id, name: sw.name, mates: mates.filter((m) => m.userId !== me.id).map((m) => ({ id: m.id, name: m.name })) }}
      openSwarms={openSwarms.map((s) => ({ id: s.id, name: s.name, members: s.members }))}
      evals={evals.filter((e) => e.open || e.showToStudents).map((e) => ({ id: e.id, title: e.title, criteria: e.criteria, open: e.open,
        mine: myResponses.filter((r) => r.evalId === e.id).map((r) => ({ rateeId: r.rateeId, scores: r.scores, comment: r.comment })),
        aboutMe: e.showToStudents ? aboutMe.filter((r) => r.evalId === e.id).map((r) => r.scores) : null }))}
    />
  );
}
