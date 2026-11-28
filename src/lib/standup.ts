import { parseQuickAdd } from "./quickadd";

// Standup notes: every line with "@Name" becomes a task for that person; a date in the line ("by Friday", "tomorrow 5pm") is its due date.

export type Person = { id: string; name: string; nickname: string | null };
export type ParsedLine = { line: string; mention: string; memberId: string | null; who: string | null; title: string; dueAt: Date | null; hasTime: boolean };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Finds who "@ian" or "@IanC" means: nickname first, then first name, then the whole name squashed together. */
export function matchPerson(mention: string, people: Person[]): Person | null {
  const m = norm(mention);
  const by = (f: (p: Person) => string | null | undefined) => people.filter((p) => { const v = f(p); return v && norm(v).replace(/\s+/g, "") === m; });
  for (const f of [(p: Person) => p.nickname, (p: Person) => p.name.split(/\s+/)[0], (p: Person) => p.name]) {
    const hits = by(f);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

export function parseStandup(text: string, people: Person[], tz: string, now = new Date()): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*[-*•\d.)\]]+\s*/, "").trim();
    const at = line.match(/@([\p{L}\p{N}_.-]+)/u);
    if (!at) continue;
    const p = matchPerson(at[1], people);
    const rest = line.replace(at[0], " ").replace(/\s+/g, " ").trim().replace(/^[:,\-–]\s*/, "");
    const q = parseQuickAdd(rest, tz, now);
    const title = q.title.replace(/\s+\b(by|before|on|until|due)\s*$/i, "").replace(/[\s,.;:-]+$/, "").trim();
    if (!title) continue;
    out.push({ line: raw.trim(), mention: at[1], memberId: p?.id ?? null, who: p ? p.nickname?.trim() || p.name : null, title: title[0].toUpperCase() + title.slice(1), dueAt: q.dueAt, hasTime: q.hasTime });
  }
  return out.slice(0, 30);
}
