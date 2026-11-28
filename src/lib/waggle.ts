// "Waggle": a short plain-text progress update to paste into a Messenger group chat. No links or formatting that GCs mangle.

export type WaggleTask = { title: string; status: string; progress: number | null; due: string | null; dueSoon: boolean; overdue: boolean };
export type WaggleDone = { who: string; what: string };

export function waggle(p: { team: string; date: string; tasks: WaggleTask[]; done: WaggleDone[] }) {
  const lines = [`🐝 ${p.team} update, ${p.date}`];
  const name = (t: WaggleTask) => t.title || "Untitled task";
  if (p.done.length) lines.push("", "✅ Done this week:", ...p.done.slice(0, 8).map((d) => `• ${d.what} (${d.who})`));
  const review = p.tasks.filter((t) => t.status === "review");
  if (review.length) lines.push("", "👀 Waiting for review:", ...review.map((t) => `• ${name(t)}`));
  const doing = p.tasks.filter((t) => t.status !== "done" && t.status !== "review" && !t.overdue && !t.dueSoon && (t.progress ?? 0) > 0);
  if (doing.length) lines.push("", "🔨 In progress:", ...doing.slice(0, 8).map((t) => `• ${name(t)}, ${t.progress}%`));
  const soon = p.tasks.filter((t) => t.status !== "done" && t.dueSoon && !t.overdue);
  if (soon.length) lines.push("", "📅 Due soon:", ...soon.map((t) => `• ${name(t)}${t.due ? `, ${t.due}` : ""}${t.progress ? ` (${t.progress}%)` : ""}`));
  const late = p.tasks.filter((t) => t.status !== "done" && t.overdue);
  if (late.length) lines.push("", "⚠️ Overdue:", ...late.map((t) => `• ${name(t)}${t.due ? `, was due ${t.due}` : ""}`));
  if (lines.length === 1) lines.push("", "Nothing new yet. Let's get started! 💪");
  lines.push("", "Updates and Mark done links come by email from HIVE-WORKSPACE.");
  return lines.join("\n");
}
