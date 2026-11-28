// Student-life helpers for My Cell: subject colours, semester terms, Nectar streaks. No database here, so it's unit-tested.

/** Subject colours: a dot beside text in the normal text colour, so each only needs to stand out from the background. */
export const SUBJECT_COLORS = ["#3987E5", "#D95926", "#199E70", "#C98500", "#D55181", "#8B5CF6", "#0EA5B7", "#7A8B2E"] as const;

export type Period = { name: string; start: string; end: string };
const day = 86_400_000;
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);

/** Splits a semester into Prelims, Midterms and Finals of (nearly) equal length. */
export function splitTerms(start: string, end: string): Period[] {
  const a = toDate(start).getTime(), b = toDate(end).getTime();
  if (!(b > a)) return [];
  const total = Math.round((b - a) / day) + 1, size = Math.floor(total / 3);
  const at = (n: number) => toKey(new Date(a + n * day));
  return [
    { name: "Prelims", start: at(0), end: at(size - 1) },
    { name: "Midterms", start: at(size), end: at(2 * size - 1) },
    { name: "Finals", start: at(2 * size), end: end },
  ];
}

/** The term today falls in, and how many days are left in it (counting today). */
export function currentTerm(periods: Period[], today: string) {
  const p = periods.find((x) => x.start <= today && today <= x.end);
  return p ? { ...p, daysLeft: Math.round((toDate(p.end).getTime() - toDate(today).getTime()) / day) + 1 } : null;
}

/** "1st Sem A.Y. 2026–2027" for a date: Aug–Dec 1st sem, Jan–May 2nd sem, Jun–Jul midyear. */
export function suggestSemesterName(today: string) {
  const [y, m] = today.split("-").map(Number);
  if (m >= 8) return `1st Sem A.Y. ${y}–${y + 1}`;
  if (m <= 5) return `2nd Sem A.Y. ${y - 1}–${y}`;
  return `Midyear A.Y. ${y - 1}–${y}`;
}

/**
 * Nectar: how many days in a row (ending today, or yesterday if today has nothing yet) had at least one finished task,
 * plus the last 7 days for the honeycomb row. Missing a day just starts a new count: no penalties.
 */
export function nectar(doneDays: Iterable<string>, today: string) {
  const set = new Set(doneDays);
  const back = (n: number) => toKey(new Date(toDate(today).getTime() - n * day));
  let streak = 0;
  for (let i = set.has(today) ? 0 : 1; set.has(back(i)); i++) streak++;
  const week = Array.from({ length: 7 }, (_, i) => ({ date: back(6 - i), filled: set.has(back(6 - i)) }));
  return { streak, week, today: set.has(today) };
}
