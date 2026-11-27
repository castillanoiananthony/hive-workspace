import type { Metadata } from "next";
import { and, asc, count, eq, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { task, team } from "@/db/schema";
import { buildFeed } from "@/lib/feed";
import { profileImages } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { HomeFeed } from "./HomeFeed";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <Suspense fallback={<HoneyLoader label="Loading your feed…" />}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const me = await requireUser();
  if (!me.onboardedAt) redirect("/onboarding");
  const [feed, images, upcoming, teams] = await Promise.all([
    buildFeed(me.id),
    profileImages(me.id),
    db.select({ id: task.id, title: task.title, status: task.status, goalId: task.goalId, dueAt: task.dueAt, hasTime: task.hasTime })
      .from(task).where(and(eq(task.ownerId, me.id), isNull(task.teamId), ne(task.status, "done"))).orderBy(asc(task.dueAt)).limit(50),
    db.select({ id: team.id, name: team.name, color: team.color, open: count(task.id) }).from(team)
      .leftJoin(task, and(eq(task.teamId, team.id), ne(task.status, "done"))).where(eq(team.ownerId, me.id)).groupBy(team.id).orderBy(asc(team.name)),
  ]);
  return (
    <HomeFeed
      me={{ name: me.name, email: me.email, avatar: images.avatar }}
      tz={me.timezone}
      feed={feed}
      upcoming={upcoming.filter((t) => t.dueAt).map((t) => ({ ...t, dueAt: t.dueAt!.toISOString() }))}
      teams={teams}
    />
  );
}
