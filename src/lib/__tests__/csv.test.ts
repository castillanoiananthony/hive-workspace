import { describe, expect, it } from "vitest";
import { toCsv } from "../csv";

describe("contribution CSV", () => {
  it("quotes commas and quotes, and defuses spreadsheet formulas", () => {
    const csv = toCsv([{ at: new Date(Date.UTC(2026, 10, 28, 4, 5)), member: "Ana, Cruz", memberId: "m1", kind: "part_done", what: '=HYPERLINK("x")', detail: "" }], "Asia/Manila");
    expect(csv.split("\r\n")[0]).toBe("Date,Member,Action,Task,Details");
    expect(csv).toContain('2026-11-28 12:05,"Ana, Cruz",Finished their part,"\'=HYPERLINK(""x"")",');
  });
});
