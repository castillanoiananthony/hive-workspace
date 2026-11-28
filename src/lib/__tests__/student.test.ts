import { describe, expect, it } from "vitest";
import { currentTerm, nectar, splitTerms, suggestSemesterName } from "../student";

describe("semester terms", () => {
  it("splits into three back-to-back terms that cover the whole sem", () => {
    const t = splitTerms("2026-08-10", "2026-12-12");
    expect(t.map((x) => x.name)).toEqual(["Prelims", "Midterms", "Finals"]);
    expect(t[0].start).toBe("2026-08-10");
    expect(t[2].end).toBe("2026-12-12");
    expect(new Date(t[1].start).getTime() - new Date(t[0].end).getTime()).toBe(86_400_000);
  });
  it("finds today's term and days left", () => {
    const t = splitTerms("2026-08-10", "2026-12-12");
    expect(currentTerm(t, t[1].end)).toMatchObject({ name: "Midterms", daysLeft: 1 });
    expect(currentTerm(t, "2027-01-05")).toBeNull();
  });
  it("names the semester the Filipino way", () => {
    expect(suggestSemesterName("2026-11-28")).toBe("1st Sem A.Y. 2026–2027");
    expect(suggestSemesterName("2027-02-01")).toBe("2nd Sem A.Y. 2026–2027");
  });
});

describe("Nectar", () => {
  it("counts days in a row, allowing today to still be empty", () => {
    expect(nectar(["2026-11-26", "2026-11-27"], "2026-11-28").streak).toBe(2);
    expect(nectar(["2026-11-26", "2026-11-27", "2026-11-28"], "2026-11-28").streak).toBe(3);
  });
  it("starts over quietly after a gap", () => {
    const n = nectar(["2026-11-20", "2026-11-28"], "2026-11-28");
    expect(n.streak).toBe(1);
    expect(n.week.filter((d) => d.filled).length).toBe(1);
  });
});
