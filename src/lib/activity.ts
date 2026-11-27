import { utcToZoned } from "./dates";

/** Counts per day for the last `n` days (today last), in the viewer's time zone. */
export function lastDays(tz: string, events: { done: (Date | null)[]; created: Date[]; posts: Date[]; logs?: Date[] }, n = 14, now = Date.now()) {
  const key = (d: Date) => utcToZoned(d, tz).date;
  const days = Array.from({ length: n }, (_, i) => {
    const d = new Date(now - (n - 1 - i) * 86_400_000);
    return { date: key(d), label: new Intl.DateTimeFormat("en", { timeZone: tz, month: "short", day: "numeric" }).format(d), done: 0, created: 0, posts: 0, updates: 0 };
  });
  const bump = (at: Date | null, k: "done" | "created" | "posts" | "updates") => { if (!at) return; const day = days.find((x) => x.date === key(at)); if (day) day[k]++; };
  events.done.forEach((d) => bump(d, "done"));
  events.created.forEach((d) => bump(d, "created"));
  events.posts.forEach((d) => bump(d, "posts"));
  events.logs?.forEach((d) => bump(d, "updates"));
  return days;
}
