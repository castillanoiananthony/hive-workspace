import { describe, expect, it } from "vitest";
import { periodFor, utcToZoned, zonedToUtc } from "../dates";
import { computeProgress, wouldCycle } from "../progress";
import { parseQuickAdd } from "../quickadd";

const g = (id: string, parentId: string | null, manualProgress = 0, done = false) => ({ id, parentId, manualProgress, done });

describe("progress rollup", () => {
  it("rolls tasks up through month into year", () => {
    const goals = [g("y", null), g("m1", "y"), g("m2", "y")];
    const tasks = [
      { goalId: "m1", status: "done" as const }, { goalId: "m1", status: "todo" as const },
      { goalId: "m2", status: "done" as const },
    ];
    const p = computeProgress(goals, tasks);
    expect(p.get("m1")).toBe(50);
    expect(p.get("m2")).toBe(100);
    expect(p.get("y")).toBe(75);
  });
  it("uses manual progress or done toggle for leaf goals", () => {
    const p = computeProgress([g("a", null, 40), g("b", null, 10, true)], []);
    expect(p.get("a")).toBe(40);
    expect(p.get("b")).toBe(100);
  });
  it("survives a parent loop in bad data", () => {
    expect(() => computeProgress([g("a", "b"), g("b", "a")], [])).not.toThrow();
  });
  it("detects re-parenting loops", () => {
    const goals = [g("y", null), g("m", "y"), g("w", "m")];
    expect(wouldCycle(goals, "y", "w")).toBe(true);
    expect(wouldCycle(goals, "w", "y")).toBe(false);
  });
});

describe("dates in Manila", () => {
  const tz = "Asia/Manila";
  it("converts both ways", () => {
    const at = zonedToUtc("2027-03-05", "17:00", tz);
    expect(at.toISOString()).toBe("2027-03-05T09:00:00.000Z");
    expect(utcToZoned(at, tz)).toEqual({ date: "2027-03-05", time: "17:00" });
  });
  it("handles a zone with daylight saving", () => {
    expect(zonedToUtc("2027-07-01", "09:00", "America/New_York").toISOString()).toBe("2027-07-01T13:00:00.000Z");
    expect(zonedToUtc("2027-01-15", "09:00", "America/New_York").toISOString()).toBe("2027-01-15T14:00:00.000Z");
  });
  it("names periods", () => {
    const at = zonedToUtc("2027-03-05", "12:00", tz);
    expect(periodFor("year", at, tz)).toBe("2027");
    expect(periodFor("month", at, tz)).toBe("2027-03");
    expect(periodFor("week", at, tz)).toBe("2027-W09");
  });
});

describe("quick add", () => {
  const tz = "Asia/Manila";
  const now = zonedToUtc("2027-03-03", "10:00", tz); // a Wednesday
  it("parses the brief's example", () => {
    const r = parseQuickAdd("Submit lab report Fri 5pm", tz, now);
    expect(r.title).toBe("Submit lab report");
    expect(r.hasTime).toBe(true);
    expect(utcToZoned(r.dueAt!, tz)).toEqual({ date: "2027-03-05", time: "17:00" });
  });
  it("keeps a date without a time as all-day", () => {
    const r = parseQuickAdd("Pay org fees tomorrow", tz, now);
    expect(r.title).toBe("Pay org fees");
    expect(r.hasTime).toBe(false);
    expect(utcToZoned(r.dueAt!, tz).date).toBe("2027-03-04");
  });
  it("leaves plain titles alone", () => {
    expect(parseQuickAdd("Read chapter 4", tz, now)).toEqual({ title: "Read chapter 4", dueAt: null, hasTime: false });
  });
  it("keeps a number that belongs to the title", () => {
    const r = parseQuickAdd("Read chapter 3 Mar 28", tz, now);
    expect(r.title).toBe("Read chapter 3");
    expect(utcToZoned(r.dueAt!, tz).date).toBe("2027-03-28");
  });
  it("treats a date a few days ago as overdue, not next year", () => {
    const r = parseQuickAdd("Org meeting Mar 1 4pm", tz, now);
    expect(utcToZoned(r.dueAt!, tz)).toEqual({ date: "2027-03-01", time: "16:00" });
  });
  it("still sends a long-past month to next year", () => {
    expect(utcToZoned(parseQuickAdd("Renew passport Jan 10", tz, now).dueAt!, tz).date).toBe("2028-01-10");
  });
  it("drops a trailing 'by'", () => {
    expect(parseQuickAdd("Send slides by Monday", tz, now).title).toBe("Send slides");
  });
});
