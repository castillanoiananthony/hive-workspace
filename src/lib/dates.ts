// Time-zone helpers built on Intl, so dates follow each user's zone (default Asia/Manila) without a library.

/** Offset of `tz` from UTC at `at`, in minutes (Manila → 480). */
export function tzOffset(tz: string, at: Date = new Date()): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2027-03-05" + "17:00" (or no time → end of that day) in `tz` → the UTC instant. */
export function zonedToUtc(date: string, time: string | null, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time ? time.split(":").map(Number) : [23, 59];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // two passes so a DST change between the guess and the real instant is still handled
  const first = guess - tzOffset(tz, new Date(guess)) * 60000;
  return new Date(guess - tzOffset(tz, new Date(first)) * 60000);
}

/** The UTC instant split back into the date and time a user in `tz` would see. */
export function utcToZoned(at: Date, tz: string): { date: string; time: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(at).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function formatDue(at: Date, hasTime: boolean, tz: string): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: tz, weekday: "short", month: "short", day: "numeric" };
  if (hasTime) Object.assign(opts, { hour: "numeric", minute: "2-digit" });
  return new Intl.DateTimeFormat("en-US", opts).format(at);
}

export function periodFor(level: "year" | "month" | "week", at: Date, tz: string): string {
  const { date } = utcToZoned(at, tz);
  const [y, m] = date.split("-");
  if (level === "year") return y;
  if (level === "month") return `${y}-${m}`;
  // ISO week number
  const d = new Date(Date.UTC(+y, +m - 1, +date.slice(8)));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** True when the moment has already passed (null: no date, so never). */
export const isPast = (d: Date | null) => Boolean(d && d.getTime() < Date.now());

/** True if the moment was within the last 3 hours ("Working now" lapses after that). */
export const isRecent = (d: Date | null, ms = 3 * 3_600_000) => Boolean(d && Date.now() - d.getTime() < ms);
