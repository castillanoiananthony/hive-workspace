import { describe, expect, it } from "vitest";
import { nameFromEmail, parseRoster } from "../roster";

describe("roster paste", () => {
  it("accepts commas, new lines and 'Name <email>'", () => {
    const r = parseRoster("ana@school.edu, ben.santos@school.edu\nCarla Reyes <CARLA@School.edu>;\n\n");
    expect(r.valid).toEqual([
      { email: "ana@school.edu", name: "Ana" },
      { email: "ben.santos@school.edu", name: "Ben Santos" },
      { email: "carla@school.edu", name: "Carla Reyes" },
    ]);
  });
  it("keeps a comma inside the name part", () => {
    expect(parseRoster('"Reyes, Carla" <carla@x.com>, dan@x.com').valid.map((v) => v.name)).toEqual(["Reyes, Carla", "Dan"]);
  });
  it("reports invalid entries and de-duplicates (also against the existing roster)", () => {
    const r = parseRoster("ana@x.com, not-an-email, ANA@x.com, ben@x.com, @x.com", ["ben@x.com"]);
    expect(r.valid.map((v) => v.email)).toEqual(["ana@x.com"]);
    expect(r.invalid).toEqual(["not-an-email", "@x.com"]);
    expect(r.duplicates).toEqual(["ana@x.com", "ben@x.com"]);
  });
  it("names people from their address", () => {
    expect(nameFromEmail("juan_dela-cruz@x.com")).toBe("Juan Dela Cruz");
  });
});
