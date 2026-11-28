import type { Metadata } from "next";
import { Suspense } from "react";
import { datedTasks } from "@/lib/calendar-data";
import { utcToZoned } from "@/lib/dates";
import { importanceOf } from "@/lib/importance";
import { lifeData } from "@/lib/life";
import { requireUser } from "@/lib/session";
import { HiveCalendar } from "./HiveCalendar";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { BackButton } from "@/components/app/BackButton";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/home" />
      <Suspense fallback={<HoneyLoader label="Loading your calendar…" />}>
        <Cal />
      </Suspense>
    </main>
  );
}

async function Cal() {
  const me = await requireUser();
  const [rows, life] = await Promise.all([datedTasks(me.id), lifeData(me)]);
  // classes repeat during the current (or next) semester; with no semester, every week
  const sem = life.semesters.find((x) => x.start <= life.today && life.today <= x.end) ?? life.semesters.find((x) => x.start > life.today);
  const classes = life.slots.map((c) => ({ id: c.id, title: c.title, weekday: c.weekday, start: c.start, end: c.end, room: c.room, color: life.subjects.find((x) => x.id === c.subjectId)?.color ?? "#6B7280", from: sem?.start ?? null, until: sem ? new Date(Date.parse(`${sem.end}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : null }));
  return (
    <HiveCalendar
      tz={me.timezone}
      classes={classes}
      tasks={rows.map((t) => {
        const z = utcToZoned(t.dueAt!, me.timezone);
        // "wall time" in the user's zone; the calendar runs in UTC mode so it shows these numbers unchanged
        return { id: t.id, title: t.title || "Untitled task", done: t.status === "done", date: z.date, time: t.hasTime ? z.time : null, space: t.teamId ?? "cell", spaceName: t.teamName ?? "My Cell", color: t.teamColor, tint: importanceOf(t.importance, t.importanceColors)?.color ?? null };
      })}
    />
  );
}
