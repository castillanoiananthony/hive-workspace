// Minimal iCalendar (RFC 5545) writer for the subscription feed: all-day and timed tasks, nothing else.

export type IcsEvent = { uid: string; title: string; start: Date; allDay: boolean; date?: string; url?: string; done?: boolean; calendar?: string };

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const ymd = (s: string) => s.replace(/-/g, "");

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "", size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; size = 0; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(name: string, events: IcsEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HIVE-WORKSPACE//Tasks//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`, "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@hive-workspace.com`, `DTSTAMP:${utc(now)}`);
    if (e.allDay && e.date) {
      const next = new Date(Date.UTC(+e.date.slice(0, 4), +e.date.slice(5, 7) - 1, +e.date.slice(8, 10) + 1)).toISOString().slice(0, 10);
      lines.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(next)}`, "TRANSP:TRANSPARENT");
    } else {
      lines.push(`DTSTART:${utc(e.start)}`, `DTEND:${utc(new Date(e.start.getTime() + 30 * 60000))}`);
    }
    lines.push(`SUMMARY:${esc((e.done ? "✓ " : "") + (e.title || "Untitled task") + (e.calendar ? ` (${e.calendar})` : ""))}`);
    if (e.url) lines.push(`URL:${e.url}`, `DESCRIPTION:${esc(`Open in HIVE-WORKSPACE: ${e.url}`)}`);
    if (e.done) lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
