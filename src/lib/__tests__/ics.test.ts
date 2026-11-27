import { describe, expect, it } from "vitest";
import { buildIcs } from "../ics";

const now = new Date("2027-03-01T00:00:00Z");

describe("ics feed", () => {
  const ics = buildIcs("Ian's tasks", [
    { uid: "a", title: "Submit lab report, v2; final", start: new Date("2027-03-05T09:00:00Z"), allDay: false, url: "https://hive-workspace.com/tasks/a" },
    { uid: "b", title: "Pay fees", start: new Date(), allDay: true, date: "2027-03-31", done: true },
  ], now);
  it("is a valid calendar with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.split("\r\n").every((l) => !l.includes("\n"))).toBe(true);
  });
  it("writes timed events in UTC and escapes text", () => {
    expect(ics).toContain("DTSTART:20270305T090000Z");
    expect(ics).toContain("SUMMARY:Submit lab report\\, v2\; final");
  });
  it("writes all-day events with an exclusive end date across a month boundary", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20270331");
    expect(ics).toContain("DTEND;VALUE=DATE:20270401");
    expect(ics).toContain("SUMMARY:✓ Pay fees");
  });
  it("folds lines over 75 bytes", () => {
    const long = buildIcs("x", [{ uid: "c", title: "é".repeat(80), start: now, allDay: false }], now);
    for (const line of long.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
