import type { Metadata } from "next";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata: Metadata = { title: "The Hive" };

export default function HivePage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="font-display text-3xl font-semibold">The Hive</h1>
      <p className="mt-1 mb-8 text-muted">Your teams, their tasks and who has done what.</p>
      <EmptyState pose="idle" title="Teams arrive in Phase 4" body="Soon you'll make a team from a list of emails and Hexley will send the reminders." />
    </main>
  );
}
