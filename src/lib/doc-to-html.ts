// Renders a Tiptap document (notes / "How to do it") as email-safe HTML and plain text.
// Only the node types our editor allows; anything else is dropped, and all text is escaped.

type Mark = { type: string; attrs?: { href?: string } };
type Node = { type: string; text?: string; marks?: Mark[]; attrs?: { level?: number }; content?: Node[] };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const safeHref = (h?: string) => (h && /^(https?:|mailto:)/i.test(h) ? h : null);

function inline(n: Node): string {
  if (n.type === "hardBreak") return "<br>";
  if (n.type !== "text" || !n.text) return "";
  let out = esc(n.text);
  for (const m of n.marks ?? []) {
    if (m.type === "bold") out = `<strong>${out}</strong>`;
    else if (m.type === "italic") out = `<em>${out}</em>`;
    else if (m.type === "code") out = `<code>${out}</code>`;
    else if (m.type === "link" && safeHref(m.attrs?.href)) out = `<a href="${esc(safeHref(m.attrs!.href)!)}" style="color:#9A6A00">${out}</a>`;
  }
  return out;
}

function block(n: Node): string {
  const kids = (n.content ?? []).map((c) => (["text", "hardBreak"].includes(c.type) ? inline(c) : block(c))).join("");
  switch (n.type) {
    case "doc": return kids;
    case "paragraph": return `<p style="margin:0 0 12px">${kids || "&nbsp;"}</p>`;
    case "heading": return `<p style="margin:16px 0 8px;font-weight:bold;font-size:${n.attrs?.level === 2 ? 17 : 15}px">${kids}</p>`;
    case "bulletList": return `<ul style="margin:0 0 12px;padding-left:22px">${kids}</ul>`;
    case "orderedList": return `<ol style="margin:0 0 12px;padding-left:22px">${kids}</ol>`;
    case "listItem": return `<li style="margin:0 0 4px">${kids.replace(/^<p style="margin:0 0 12px">([\s\S]*)<\/p>$/, "$1")}</li>`;
    case "blockquote": return `<blockquote style="margin:0 0 12px;padding-left:12px;border-left:3px solid #E5E5E5">${kids}</blockquote>`;
    default: return kids;
  }
}

function text(n: Node, depth = 0): string {
  if (n.type === "text") return n.text ?? "";
  if (n.type === "hardBreak") return "\n";
  const kids = (n.content ?? []).map((c) => text(c, depth + 1));
  if (n.type === "bulletList") return kids.map((k) => `- ${k.trim()}`).join("\n") + "\n\n";
  if (n.type === "orderedList") return kids.map((k, i) => `${i + 1}. ${k.trim()}`).join("\n") + "\n\n";
  if (n.type === "paragraph" || n.type === "heading") return kids.join("") + (depth > 1 ? "" : "\n\n");
  return kids.join("");
}

const asDoc = (doc: unknown): Node | null => (doc && typeof doc === "object" && (doc as Node).type === "doc" ? (doc as Node) : null);
export const docToHtml = (doc: unknown) => { const d = asDoc(doc); return d ? block(d) : ""; };
export const docToText = (doc: unknown) => { const d = asDoc(doc); return d ? text(d).replace(/\n{3,}/g, "\n\n").trim() : ""; };
