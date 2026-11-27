import type { Metadata } from "next";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="font-display text-3xl font-semibold">Calendar</h1>
      <p className="mt-1 mb-8 text-muted">Every task with a due date, yours and your teams&apos;.</p>
      <EmptyState pose="idle" title="The calendar arrives in Phase 3" body="Tasks will appear on their due dates, and you'll drag them to reschedule." />
    </main>
  );
}
