import type { Metadata } from "next";
import { and, count, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HexBadge } from "@/components/app/HexBadge";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { follow, goal, task, teamMember, user } from "@/db/schema";
import { profileImages } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { FollowButton } from "../../people/FollowButton";

export const metadata: Metadata = { title: "Profile" };

export default function UserPage({ params }: PageProps<"/u/[id]">) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/people" />
      <Suspense fallback={<HoneyLoader label="Loading profile…" />}><Person params={params} /></Suspense>
    </main>
  );
}

/** Someone else's profile: picture, banner, description and a few counts. Never their email. */
async function Person({ params }: { params: PageProps<"/u/[id]">["params"] }) {
  const { id } = await params;
  const me = await requireUser();
  if (id === me.id) redirect("/profile");
  const [p] = await db.select({ id: user.id, name: user.name, bio: user.bio, createdAt: user.createdAt, onboardedAt: user.onboardedAt }).from(user).where(eq(user.id, id));
  if (!p || !p.onboardedAt) notFound();
  p.name = p.name.trim() || "Unnamed member";
  const [images, [followers], [following], [teams], [done], [goals], [mine]] = await Promise.all([
    profileImages(id),
    db.select({ n: count() }).from(follow).where(eq(follow.followingId, id)),
    db.select({ n: count() }).from(follow).where(eq(follow.followerId, id)),
    db.select({ n: count() }).from(teamMember).where(eq(teamMember.userId, id)),
    db.select({ n: count() }).from(task).where(and(eq(task.ownerId, id), eq(task.status, "done"))),
    db.select({ n: count() }).from(goal).where(and(eq(goal.ownerId, id), isNull(goal.archivedAt))),
    db.select({ x: follow.followerId }).from(follow).where(and(eq(follow.followerId, me.id), eq(follow.followingId, id))),
  ]);
  const stat = (label: string, n: number) => <div><dt className="text-sm text-muted">{label}</dt><dd className="font-display text-2xl font-semibold tabular-nums">{n}</dd></div>;
  return (
    <>
      <h1 className="sr-only">{p.name}</h1>
      <section className="overflow-hidden rounded-[calc(var(--radius)*2)] border border-line bg-surface">
        <div className="relative h-36 bg-raised sm:h-56">
          {images.banner
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={images.banner} alt="" className="size-full object-cover" />
            : <div aria-hidden className="honeycomb absolute inset-0 opacity-[0.12]" />}
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-5 pb-6 sm:px-8">
          <div className="relative -mt-14 sm:-mt-16">
            {images.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={images.avatar} alt={`${p.name}'s profile picture`} width={128} height={128} className="size-28 rounded-full border-4 border-accent bg-raised object-cover shadow-xl sm:size-32" />
              : <span className="grid size-28 place-items-center rounded-full border-4 border-accent bg-raised sm:size-32"><HexBadge label={p.name} color="#F5B80B" size={72} /></span>}
          </div>
          <div className="min-w-0 basis-full sm:basis-0 sm:flex-1 sm:pb-1">
            <p className="font-display text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">{p.name}</p>
            <p className="text-sm text-muted">Member since {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: me.timezone }).format(p.createdAt)}</p>
          </div>
          <FollowButton userId={p.id} name={p.name} initial={Boolean(mine)} />
        </div>
      </section>
      <section aria-labelledby="about-h" className="mt-6 rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5 sm:p-6">
        <h2 id="about-h" className="font-display text-xl font-semibold">About</h2>
        <p className={`mt-3 whitespace-pre-line ${p.bio ? "" : "text-muted"}`}>{p.bio || `${p.name} hasn't written a description yet.`}</p>
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center sm:grid-cols-5">
          {stat("Followers", followers.n)}{stat("Following", following.n)}{stat("Teams", teams.n)}{stat("Goals", goals.n)}{stat("Tasks done", done.n)}
        </dl>
      </section>
    </>
  );
}
