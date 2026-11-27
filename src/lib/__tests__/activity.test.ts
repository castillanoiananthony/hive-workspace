import { describe, expect, it } from "vitest";
import { lastDays } from "../activity";

describe("lastDays", () => {
  it("buckets events by day in the time zone and ignores older ones", () => {
    const now = Date.UTC(2026, 10, 28, 4, 0); // 12:00 in Manila
    const d = lastDays("Asia/Manila", { done: [new Date(Date.UTC(2026, 10, 27, 20, 0)), null], created: [new Date(Date.UTC(2026, 10, 1))], posts: [new Date(Date.UTC(2026, 10, 26, 1))] }, 14, now);
    expect(d).toHaveLength(14);
    expect(d.at(-1)).toMatchObject({ date: "2026-11-28", done: 1 }); // 20:00 UTC on the 27th is the 28th in Manila
    expect(d.find((x) => x.date === "2026-11-26")?.posts).toBe(1);
    expect(d.reduce((s, x) => s + x.created, 0)).toBe(0);
  });
});
