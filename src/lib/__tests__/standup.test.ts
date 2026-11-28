import { describe, expect, it } from "vitest";
import { matchPerson, parseStandup } from "../standup";

const people = [{ id: "a", name: "Ian Anthony Castillano", nickname: null }, { id: "b", name: "Ana Cruz", nickname: "Ann" }, { id: "c", name: "Ben Santos", nickname: null }];

describe("standup notes → tasks", () => {
  it("matches people by nickname, first name or full name", () => {
    expect(matchPerson("ian", people)?.id).toBe("a");
    expect(matchPerson("Ann", people)?.id).toBe("b");
    expect(matchPerson("BenSantos", people)?.id).toBe("c");
    expect(matchPerson("zed", people)).toBeNull();
  });
  it("turns each @line into a task with a due date and skips the rest", () => {
    const now = new Date("2026-11-28T04:00:00Z"); // Saturday noon in Manila
    const r = parseStandup("Standup Sat\n- @Ian fix login bug by Friday\n- talked about the demo\n- @Ann write README tomorrow 5pm\n- @zed buy snacks", people, "Asia/Manila", now);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ memberId: "a", title: "Fix login bug", hasTime: false });
    expect(r[0].dueAt?.toISOString().slice(0, 10)).toBe("2026-12-04");
    expect(r[1]).toMatchObject({ memberId: "b", title: "Write README", hasTime: true });
    expect(r[2]).toMatchObject({ memberId: null, title: "Buy snacks" });
  });
});
