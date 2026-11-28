import { describe, expect, it } from "vitest";
import { countdown, planMilestones, presetChecklists } from "../hive-templates";

describe("hive templates", () => {
  it("plans a 36-hour hackathon to the half hour, ending at submission", () => {
    const m = planMilestones("hackathon", { start: "2026-12-05", startTime: "09:00", hours: 36 });
    expect(m.map((x) => x.title)).toEqual(["Idea locked", "MVP working", "Demo ready", "Pitch deck done", "Submitted"]);
    expect(m[0]).toMatchObject({ date: "2026-12-05", time: "12:30" }); // 3.6 h → 12:36 → rounded
    expect(m.at(-1)).toMatchObject({ date: "2026-12-06", time: "21:00" });
  });
  it("spreads a competition between today and the final date", () => {
    const m = planMilestones("competition", { start: "2026-12-01", end: "2027-03-01" });
    expect(m[0].title).toBe("Registration");
    expect(m.at(-1)).toMatchObject({ title: "Final submission", date: "2027-03-01", time: null });
    expect(m.map((x) => x.date)).toEqual([...m.map((x) => x.date)].sort());
  });
  it("lays out sprints for a software project", () => {
    const m = planMilestones("project", { start: "2027-01-04", sprints: 3 });
    expect(m.map((x) => x.title)).toEqual(["Planning", "Sprint 1", "Sprint 2", "Sprint 3", "Testing", "Release"]);
    expect(m[1].date).toBe("2027-01-24");
  });
  it("gives hackathons a pitch checklist", () => {
    expect(presetChecklists("hackathon").map((c) => c.title)).toEqual(["Submission", "Pitch / demo prep"]);
    expect(presetChecklists("blank")).toEqual([]);
  });
  it("counts down in days, or hours and minutes for hackathons", () => {
    expect(countdown(2 * 86_400_000 + 4 * 3_600_000, false).text).toBe("2d 4h");
    expect(countdown(5 * 3_600_000 + 12 * 60_000, true).text).toBe("5h 12m");
    expect(countdown(-30 * 60_000, true)).toEqual({ late: true, text: "30m" });
  });
});
