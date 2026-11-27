// Pure date maths for Buzz scheduling, kept separate so it can be unit-tested.
import { utcToZoned } from "./dates";

const DAY = 86400000;

/** Whole days from today to the due date, both in the owner's time zone. */
export function daysLeft(dueAt: Date, now: Date, tz: string) {
  const d = (x: Date) => Date.parse(`${utcToZoned(x, tz).date}T00:00:00Z`);
  return Math.round((d(dueAt) - d(now)) / DAY);
}
export const localHour = (now: Date, tz: string) => Number(utcToZoned(now, tz).time.slice(0, 2));

/** Next due date (owner's zone) on or after `today`. */
export function nextOccurrence(today: string, rule: { recurrence: "weekly" | "monthly"; weekday: number | null; monthDay: number | null }): string {
  const d = new Date(`${today}T00:00:00Z`);
  if (rule.recurrence === "weekly") {
    d.setUTCDate(d.getUTCDate() + (((rule.weekday ?? 5) - d.getUTCDay() + 7) % 7));
  } else {
    const day = rule.monthDay ?? 1;
    if (d.getUTCDate() > day) d.setUTCMonth(d.getUTCMonth() + 1, day);
    else d.setUTCDate(day);
  }
  return d.toISOString().slice(0, 10);
}

