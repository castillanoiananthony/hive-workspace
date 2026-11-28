// Hive templates: preset milestones and checklists for hackathons, competitions and software projects.
// Dates are "wall time" strings in the user's zone (YYYY-MM-DD and HH:MM), so this file needs no time zones.

export type Kind = "blank" | "hackathon" | "competition" | "project";
export type PlannedMilestone = { title: string; date: string; time: string | null };

export const TEMPLATES: { id: Kind; label: string; hint: string }[] = [
  { id: "hackathon", label: "Hackathon (24–72 hrs)", hint: "Hour-by-hour milestones from kickoff to submission" },
  { id: "competition", label: "Coding competition", hint: "Multi-round: registration to final submission" },
  { id: "project", label: "Software project", hint: "Planning, sprints, testing and release" },
  { id: "blank", label: "Blank", hint: "No milestones; add your own later" },
];

export const SUBMISSION_ITEMS = ["Repo is public (or shared with the judges)", "README explains how to run it", "Demo video uploaded", "Submission form sent"];
export const PITCH_ITEMS = ["Problem slide", "Solution slide", "Demo flow rehearsed", "Tech stack slide", "Team slide"];

/** Checklists a new hive starts with. */
export function presetChecklists(kind: Kind): { title: string; items: string[] }[] {
  if (kind === "hackathon") return [{ title: "Submission", items: SUBMISSION_ITEMS }, { title: "Pitch / demo prep", items: PITCH_ITEMS }];
  if (kind === "competition" || kind === "project") return [{ title: "Submission", items: SUBMISSION_ITEMS }];
  return [];
}

const MIN = 60_000, DAY = 86_400_000;
const toMs = (date: string, time = "00:00") => Date.parse(`${date}T${time}:00Z`);
const fromMs = (ms: number) => { const d = new Date(ms).toISOString(); return { date: d.slice(0, 10), time: d.slice(11, 16) }; };
const roundTo30 = (ms: number) => Math.round(ms / (30 * MIN)) * 30 * MIN;

/**
 * Suggested milestones. Hackathon: kickoff (date + time) and length in hours. Competition: today and the final deadline.
 * Software project: start date and number of two-week sprints.
 */
export function planMilestones(kind: Kind, o: { start: string; startTime?: string; hours?: number; end?: string; sprints?: number }): PlannedMilestone[] {
  if (kind === "hackathon") {
    const a = toMs(o.start, o.startTime || "09:00"), len = Math.max(1, o.hours ?? 36) * 60 * MIN;
    return ([["Idea locked", 0.1], ["MVP working", 0.5], ["Demo ready", 0.8], ["Pitch deck done", 0.9], ["Submitted", 1]] as const)
      .map(([title, f]) => { const x = fromMs(f === 1 ? a + len : roundTo30(a + f * len)); return { title, date: x.date, time: x.time }; });
  }
  if (kind === "competition") {
    const a = toMs(o.start), b = o.end ? toMs(o.end) : a + 60 * DAY, span = Math.max(DAY, b - a);
    return ([["Registration", 0.05], ["Setup / environment", 0.2], ["First working version", 0.4], ["Round 1 submission", 0.55], ["Improvement", 0.8], ["Final submission", 1]] as const)
      .map(([title, f]) => ({ title, date: fromMs(f === 1 ? b : a + Math.round((f * span) / DAY) * DAY).date, time: null }));
  }
  if (kind === "project") {
    const a = toMs(o.start), n = Math.min(12, Math.max(1, o.sprints ?? 4));
    const sprintEnd = (k: number) => a + 6 * DAY + 14 * k * DAY; // a planning week, then two-week sprints
    return [
      { title: "Planning", date: fromMs(a + 6 * DAY).date, time: null },
      ...Array.from({ length: n }, (_, i) => ({ title: `Sprint ${i + 1}`, date: fromMs(sprintEnd(i + 1)).date, time: null })),
      { title: "Testing", date: fromMs(sprintEnd(n) + 7 * DAY).date, time: null },
      { title: "Release", date: fromMs(sprintEnd(n) + 10 * DAY).date, time: null },
    ];
  }
  return [];
}

/** "2d 4h", "5h 12m", "12m": time left to a milestone. Hackathons always show hours and minutes. */
export function countdown(ms: number, hourly: boolean) {
  const late = ms < 0, a = Math.abs(ms);
  const d = Math.floor(a / DAY), h = Math.floor((a % DAY) / (60 * MIN)), m = Math.floor((a % (60 * MIN)) / MIN);
  const text = !hourly && d >= 1 ? `${d}d ${h}h` : d >= 1 ? `${d}d ${h}h ${m}m` : h >= 1 ? `${h}h ${m}m` : `${m}m`;
  return { late, text };
}
