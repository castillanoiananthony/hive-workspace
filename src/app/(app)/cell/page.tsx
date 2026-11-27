import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { HexProgress } from "@/components/brand/HexProgress";
import { db } from "@/db";
import { goal, task } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My Cell" };

export default function CellPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<p className="text-muted">Loading your cell…</p>}>
        <Cell />
      </Suspense>
    </main>
  );
}

async function Cell() {
  const me = await requireUser();
  if (!me.onboardedAt) redirect("/onboarding");
  const [goals, tasks] = await Promise.all([
    db.select().from(goal).where(eq(goal.ownerId, me.id)).orderBy(desc(goal.createdAt)),
    db.select({ id: task.id, goalId: task.goalId, status: task.status, title: task.title }).from(task).where(eq(task.ownerId, me.id)),
  ]);
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">My Cell</h1>
      <p className="mt-1 text-muted">Your goals and what you&apos;re doing about them this week.</p>
      <section aria-labelledby="goals" className="mt-8">
        <h2 id="goals" className="sr-only">Goals</h2>
        {goals.length === 0 ? (
          <EmptyState title="No goals yet" body="Goals you add show up here with a honeycomb that fills as you finish tasks." />
        ) : (
          <ul className="grid gap-3">
            {goals.map((g) => {
              const kids = tasks.filter((t) => t.goalId === g.id);
              // shortcut: one-level rollup until Phase 2 adds the full year → month → week ladder
              const pct = kids.length ? (100 * kids.filter((t) => t.status === "done").length) / kids.length : g.manualProgress;
              return (
                <li key={g.id} className="flex items-center gap-4 rounded-[var(--radius)] border border-line bg-surface p-4">
                  <HexProgress value={pct} size={44} label={`${g.title} progress`} />
                  <div className="min-w-0">
                    <p className="font-medium">{g.title}</p>
                    <p className="text-sm text-muted">{g.period} goal, {kids.length} {kids.length === 1 ? "task" : "tasks"}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
