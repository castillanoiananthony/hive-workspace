import * as chrono from "chrono-node";
import { tzOffset, zonedToUtc } from "./dates";

export type QuickAdd = { title: string; dueAt: Date | null; hasTime: boolean };

type Hit = { index: number; text: string; start: chrono.ParsedComponents };

function parse(text: string, tz: string, now: Date): Hit | undefined {
  const ref = { instant: now, timezone: tzOffset(tz, now) };
  let [hit] = chrono.parse(text, ref, { forwardDate: true }) as Hit[];
  // "chapter 3 Nov 28" must read as Nov 28, not "3 Nov 2028": a number glued in front of "Month DD" belongs to the title
  if (hit && /^\d{1,2}\s+\p{L}+\.?\s+\d{1,2}\b/u.test(hit.text) && !/\d{4}/.test(hit.text)) {
    const skip = hit.text.indexOf(" ") + 1;
    const [again] = chrono.parse(text.slice(hit.index + skip), ref, { forwardDate: true }) as Hit[];
    if (again) hit = { ...again, index: again.index + hit.index + skip };
  }
  return hit;
}

/** "Submit lab report Fri 5pm" → title "Submit lab report", due next Friday 17:00 in the user's zone. */
export function parseQuickAdd(input: string, tz: string, now: Date = new Date()): QuickAdd {
  const text = input.trim().replace(/\s+/g, " ");
  const hit = parse(text, tz, now);
  if (!hit) return { title: text, dueAt: null, hasTime: false };
  const title = (text.slice(0, hit.index) + text.slice(hit.index + hit.text.length)).replace(/\s+(on|by|due|at)\s*$/i, "").replace(/\s+/g, " ").trim();
  const c = hit.start;
  let year = c.get("year")!;
  // a date from the last two weeks ("Nov 24" on Nov 27) is an overdue task, not one for next year
  if (!c.isCertain("year") && c.isCertain("month") && year > Number(zonedYear(now, tz))) {
    const thisYear = zonedToUtc(`${year - 1}-${pad(c.get("month")!)}-${pad(c.get("day")!)}`, null, tz);
    if (now.getTime() - thisYear.getTime() < 14 * 86400000) year -= 1;
  }
  const date = `${year}-${pad(c.get("month")!)}-${pad(c.get("day")!)}`;
  const hasTime = c.isCertain("hour");
  const time = hasTime ? `${pad(c.get("hour")!)}:${pad(c.get("minute") ?? 0)}` : null;
  return { title: title || text, dueAt: zonedToUtc(date, time, tz), hasTime };
}

const pad = (n: number) => String(n).padStart(2, "0");
const zonedYear = (at: Date, tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric" }).format(at);
