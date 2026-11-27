import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({}));
const { makeJoinCode, cleanCode } = await import("../colony");

describe("class join codes", () => {
  it("are 6 characters with no look-alikes", () => {
    for (let i = 0; i < 200; i++) expect(makeJoinCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
  it("accept what students type", () => {
    expect(cleanCode(" ab3-k7q ")).toBe("AB3K7Q");
  });
});
