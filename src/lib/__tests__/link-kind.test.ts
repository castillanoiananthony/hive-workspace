import { describe, expect, it } from "vitest";
import { linkKind } from "../link-kind";

describe("vault link kinds", () => {
  it("recognises common team tools", () => {
    expect(linkKind("https://drive.google.com/drive/folders/abc")).toBe("drive");
    expect(linkKind("https://docs.google.com/spreadsheets/d/x/edit")).toBe("sheets");
    expect(linkKind("https://docs.google.com/document/d/x/edit")).toBe("docs");
    expect(linkKind("https://github.com/castillanoiananthony/hive-workspace")).toBe("github");
    expect(linkKind("https://www.canva.com/design/x")).toBe("canva");
    expect(linkKind("https://youtu.be/abc")).toBe("youtube");
  });
  it("falls back to other", () => {
    expect(linkKind("https://example.com")).toBe("other");
    expect(linkKind("not a url")).toBe("other");
  });
});
