import { describe, expect, it } from "vitest";
import { waggle } from "../waggle";

describe("Copy update for GC", () => {
  it("groups the team's state into short plain lines", () => {
    const t = waggle({ team: "Physics Lab Group", date: "Nov 28", done: [{ who: "Ana", what: "Record angles" }], tasks: [
      { title: "Report", status: "doing", progress: 60, due: "Fri", dueSoon: true, overdue: false },
      { title: "Slides", status: "review", progress: 100, due: null, dueSoon: false, overdue: false },
      { title: "Buy tape", status: "todo", progress: 0, due: "Mon", dueSoon: false, overdue: true },
    ] });
    expect(t.split("\n")[0]).toBe("🐝 Physics Lab Group update, Nov 28");
    expect(t).toContain("• Record angles (Ana)");
    expect(t).toContain("• Report, Fri (60%)");
    expect(t).toContain("👀 Waiting for review:\n• Slides");
    expect(t).toContain("• Buy tape, was due Mon");
    expect(t).not.toMatch(/https?:/);
  });
});
