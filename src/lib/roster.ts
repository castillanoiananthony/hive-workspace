// Turns whatever people paste ("a@x.com, b@y.com", one per line, or "Ana Cruz <ana@x.com>") into clean members.

export type Parsed = { valid: { name: string; email: string }[]; invalid: string[]; duplicates: string[] };

const EMAIL = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

/** "ana.cruz@school.edu" → "Ana Cruz" when no name is given. */
export function nameFromEmail(email: string): string {
  return email.split("@")[0].split("+")[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || email;
}

export function parseRoster(input: string, existing: string[] = []): Parsed {
  const seen = new Set(existing.map((e) => e.toLowerCase()));
  const out: Parsed = { valid: [], invalid: [], duplicates: [] };
  const chunks = split(input);
  for (const chunk of chunks) {
    const angled = chunk.match(/^(.*?)<\s*([^>]+?)\s*>\s*$/);
    const email = (angled ? angled[2] : chunk).replace(/^mailto:/i, "").trim().toLowerCase();
    const name = (angled ? angled[1] : "").trim().replace(/^["']|["']$/g, "").trim();
    if (!EMAIL.test(email) || email.length > 254) { out.invalid.push(chunk); continue; }
    if (seen.has(email)) { out.duplicates.push(email); continue; }
    seen.add(email);
    out.valid.push({ email, name: (name || nameFromEmail(email)).slice(0, 80) });
  }
  return out;
}

/** Split on new lines, commas and semicolons, except inside "quotes" or <angle brackets>. */
function split(input: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false, angled = false;
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "<") angled = true;
    else if (ch === ">") angled = false;
    if ((ch === "," || ch === ";" || ch === "\n") && !quoted && !angled) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}
