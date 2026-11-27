import type { Metadata } from "next";
import { and, count, eq, isNull } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { goal, task, team } from "@/db/schema";
import { profileImages } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { ProfileView } from "./ProfileView";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { BackButton } from "@/components/app/BackButton";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/home" />
      <Suspense fallback={<HoneyLoader label="Loading your profile…" />}>
        <Profile />
      </Suspense>
    </main>
  );
}

async function Profile() {
  const me = await requireUser();
  const [images, [goals], [done], [teams]] = await Promise.all([
    profileImages(me.id),
    db.select({ n: count() }).from(goal).where(and(eq(goal.ownerId, me.id), isNull(goal.archivedAt))),
    db.select({ n: count() }).from(task).where(and(eq(task.ownerId, me.id), eq(task.status, "done"))),
    db.select({ n: count() }).from(team).where(eq(team.ownerId, me.id)),
  ]);
  return (
    <ProfileView
      name={me.name} email={me.email} bio={me.bio ?? ""} avatar={images.avatar} banner={images.banner}
      since={new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: me.timezone }).format(me.createdAt)}
      stats={{ goals: goals.n, done: done.n, teams: teams.n }}
    />
  );
}
