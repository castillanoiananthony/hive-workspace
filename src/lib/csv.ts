export type ContributionRow = { at: Date; member: string; memberId: string | null; kind: string; what: string; detail: string };

export const KIND_LABEL: Record<string, string> = {
  part_done: "Finished their part", subtask_done: "Finished a subtask", sent_for_review: "Sent for review", approved: "Approved as done", progress: "Progress update",
};

/** RFC 4180 CSV; cells that start with = + - @ are prefixed so spreadsheets don't run them as formulas. */
export function toCsv(rows: ContributionRow[], tz: string) {
  const cell = (v: string) => { const s = /^[=+\-@]/.test(v) ? `'${v}` : v; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const when = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d).replace(",", "");
  return ["Date,Member,Action,Task,Details", ...rows.map((r) => [when(r.at), r.member, KIND_LABEL[r.kind] ?? r.kind, r.what, r.detail].map(cell).join(","))].join("\r\n") + "\r\n";
}
