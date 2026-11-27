import * as chrono from "chrono-node";
import { tzOffset, zonedToUtc } from "./dates";

export type QuickAdd = { title: string; dueAt: Date | null; hasTime: boolean };

/** "Submit lab report Fri 5pm" → title "Submit lab report", due next Friday 17:00 in the user's zone. */
export function parseQuickAdd(input: string, tz: string, now: Date = new Date()): QuickAdd {
  const text = input.trim().replace(/\s+/g, " ");
  const [hit] = chrono.parse(text, { instant: now, timezone: tzOffset(tz, now) }, { forwardDate: true });
  if (!hit) return { title: text, dueAt: null, hasTime: false };
  const title = (text.slice(0, hit.index) + text.slice(hit.index + hit.text.length)).replace(/\s+(on|by|due|at)\s*$/i, "").replace(/\s+/g, " ").trim();
  const c = hit.start;
  const date = `${c.get("year")}-${String(c.get("month")).padStart(2, "0")}-${String(c.get("day")).padStart(2, "0")}`;
  const hasTime = c.isCertain("hour");
  const time = hasTime ? `${String(c.get("hour")).padStart(2, "0")}:${String(c.get("minute") ?? 0).padStart(2, "0")}` : null;
  return { title: title || text, dueAt: zonedToUtc(date, time, tz), hasTime };
}
