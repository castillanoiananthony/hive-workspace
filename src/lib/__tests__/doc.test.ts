import { describe, expect, it } from "vitest";
import { docToHtml, docToText } from "../doc-to-html";

const doc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Run <trial> 3 " }, { type: "text", text: "first", marks: [{ type: "bold" }] }] },
    { type: "orderedList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Fill the table" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Upload", marks: [{ type: "link", attrs: { href: "https://drive.example.com/x" } }] }] }] },
    ] },
    { type: "paragraph", content: [{ type: "text", text: "bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
  ],
};

describe("task documents in emails", () => {
  it("escapes text and keeps formatting", () => {
    const html = docToHtml(doc);
    expect(html).toContain("Run &lt;trial&gt; 3 <strong>first</strong>");
    expect(html).toContain('<ol style="margin:0 0 12px;padding-left:22px"><li style="margin:0 0 4px">Fill the table</li>');
    expect(html).toContain('href="https://drive.example.com/x"');
  });
  it("drops unsafe links", () => {
    expect(docToHtml(doc)).not.toContain("javascript:");
  });
  it("writes a plain-text version", () => {
    expect(docToText(doc)).toBe("Run <trial> 3 first\n\n1. Fill the table\n2. Upload\n\nbad");
  });
  it("handles empty input", () => {
    expect(docToHtml(null)).toBe("");
    expect(docToText({ nope: 1 })).toBe("");
  });
});
