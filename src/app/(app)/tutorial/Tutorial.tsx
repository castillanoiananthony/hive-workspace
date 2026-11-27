"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HexCheck } from "@/components/app/HexCheck";
import { Bee, type BeePose } from "@/components/brand/Bee";
import { HexProgress } from "@/components/brand/HexProgress";
import { formatDue } from "@/lib/dates";
import { parseQuickAdd } from "@/lib/quickadd";

type Chapter = { id: string; part: string; title: string; pose: BeePose; what: string; steps: string[]; tip?: string; try?: { href: string; label: string }; demo?: "progress" | "quickadd" | "tick" | "board" };

// The order follows how a new person meets the app: their own goals first, then dates, then teams.
const CHAPTERS: Chapter[] = [
  { id: "ladder", part: "My Cell", title: "Your goal ladder", pose: "wave", demo: "progress",
    what: "Big goals break into smaller ones: a year goal holds month goals, and a month goal holds week goals. Each goal has a honeycomb cell that fills as its tasks get done.",
    steps: ["Open My Cell and click New goal.", "Pick how big it is: this year, this month or this week.", "For a month or week goal, choose which bigger goal it's part of.", "Under any goal, use “Add month goal” or “Add week goal” to go one level smaller."],
    tip: "A goal with nothing under it gets a progress slider and an “It's done” tick in Edit.", try: { href: "/cell", label: "Make a goal" } },
  { id: "tasks", part: "My Cell", title: "Tasks that open like documents", pose: "idle", demo: "tick",
    what: "A task is one thing you can do this week. Click any task to open it as a page with notes, a checklist, links, a due date and a status.",
    steps: ["Under a goal, click Add task (or click any task's name).", "Type a title, then write notes. Use the small buttons for headings, bold and lists.", "Set Importance to Low, Medium or High: the coloured tag shows in every task list. Teams pick their own colours in Team settings.", "Add checklist items and links further down.", "Set the due date and, if it matters, a time."],
    tip: "There's no Save button. Everything saves as you type; watch for “Saved” at the top.", try: { href: "/cell/tasks", label: "See all tasks" } },
  { id: "quickadd", part: "My Cell", title: "Quick add with dates", pose: "fly", demo: "quickadd",
    what: "The quick add box on My Cell turns a sentence into a task. If you mention a day or time, it becomes the due date.",
    steps: ["Type something like “Submit lab report Fri 5pm”.", "Check the preview under the box: it shows the title and due date it understood.", "Press Enter or Add."],
    try: { href: "/cell", label: "Try quick add" } },
  { id: "upnext", part: "My Cell", title: "Up next and forgotten goals", pose: "sleep",
    what: "The Up next panel lists anything overdue or due in the next 7 days. If a goal hasn't changed for two weeks, Hexley shows a gentle reminder card.",
    steps: ["Tick tasks off right from Up next.", "On the reminder card, choose Plan a task, Snooze 1 week or Archive.", "Archived goals live at the bottom of My Cell, where you can restore or delete them."],
    try: { href: "/cell", label: "Open My Cell" } },
  { id: "calendar", part: "Calendar", title: "See and move your due dates", pose: "idle",
    what: "The Calendar shows every task with a due date, yours and your teams', in Month, Week or Agenda view.",
    steps: ["Switch views with Month, Week and Agenda.", "Drag a task to another day to move it. On a phone, press and hold it first.", "Click a task to open it.", "Use the tick boxes to show or hide My Cell and each team."],
    try: { href: "/calendar", label: "Open the calendar" } },
  { id: "feed", part: "Calendar", title: "Put your tasks in Google Calendar", pose: "wave",
    what: "A private calendar link keeps your due dates in Google Calendar, Outlook or Apple Calendar.",
    steps: ["Go to Settings and find Calendar link.", "Click Create my calendar link, then Copy link.", "In Google Calendar: Other calendars → + → From URL → paste → Add calendar."],
    tip: "Anyone with the link can see your task titles. If it leaks, click “Make a new link”.", try: { href: "/settings#calendar-feed", label: "Get my calendar link" } },
  { id: "teams", part: "The Hive", title: "Make a team and invite people", pose: "wave",
    what: "You become the team's admin. Invite people by email, or turn on a join link and share it in your group chat. Invited people still get task emails until they sign up.",
    steps: ["Open The Hive and click New team.", "In Members, paste everyone's emails, separated by commas or new lines, and click Send invites.", "Or click Turn on the join link and share it. Switch it off once everyone's in."],
    try: { href: "/hive", label: "Make a team" } },
  { id: "comb", part: "The Hive", title: "The Comb", pose: "idle",
    what: "Each team has its own feed. Members post updates, and new tasks and finished work show up on their own.",
    steps: ["Open a team; The Comb is the first tab.", "Write an update and click Post.", "Delete your own posts any time (the admin can remove any post).", "With the “Hide posts” power (the Leader always has it), Hide takes a post off the team’s Comb. View hidden posts shows them again, and Unhide brings one back."],
    try: { href: "/hive", label: "Open a team" } },
  { id: "vault", part: "The Hive", title: "Hive Vault", pose: "idle",
    what: "The team's shared links in one place: the Google Drive folder, the GitHub repo, slides, docs. They're grouped by where they live, so nobody has to ask for the link again.",
    steps: ["Open a team and choose Hive Vault.", "Paste a link, give it a name and an optional note, then click Add to the Vault.", "The admin decides who may add links with the “Add to the Hive Vault” power in Hive control."],
    try: { href: "/hive", label: "Open a team" } },
  { id: "hierarchy", part: "The Hive", title: "Hierarchy, roles and Hive control", pose: "celebrate",
    what: "The admin sits at the top of the team chart. The outline on the left shows who reports to whom: the further someone is indented, the further down the chain they are.",
    steps: ["Open Hierarchy. Hold the ⠿ handle and drag a name onto someone's row to put them under that person.", "As the Leader, pick each person's role (Co-lead, Assistant, or your own). Only the Leader hands out roles.", "Team settings → Roles: tap a role to rename it, tick its powers, delete it, or add a new one.", "As admin, click Hive control on anyone to choose exactly what they may do: edit nicknames, create tasks, manage members and more.", "Anyone can give themselves a nickname; editing other people's needs that power."],
    try: { href: "/hive", label: "Open a team" } },
  { id: "buzz", part: "The Hive", title: "Assign a task (Buzz emails)", pose: "fly",
    what: "Team tasks are emailed to the people you assign, with the steps and a Mark done button. Reminders go out 3 days and 1 day before the due date.",
    steps: ["In your team, click New team task.", "Give it a title, a due date and the steps under “How to do it”.", "Tick who should do it, or click Assign whole team.", "They're emailed a minute after your last change, or click Send now."],
    tip: "Reminders stop as soon as someone marks their part done, and only arrive between 8 AM and 8 PM your time.", try: { href: "/hive", label: "Go to my teams" } },
  { id: "done", part: "The Hive", title: "What teammates see", pose: "celebrate",
    what: "Each email has a big Mark done button. One click marks their part done, with no account and no password, and they can undo it. Every email also has a link to stop emails from that team.",
    steps: ["They open the email and click Mark done.", "A page says “Nice! Marked as done ✓”.", "Your status board updates right away."] },
  { id: "board", part: "The Hive", title: "Status board and email log", pose: "idle", demo: "board",
    what: "The Tasks tab shows every team task against every member: Done, Pending or Overdue, with each person's percentage. The Email log tab lists every email sent.",
    steps: ["Open a team; the Tasks tab is the board.", "Click a task name to open it.", "Check Email log to see who got what, and when."],
    try: { href: "/hive", label: "Open a team" } },
  { id: "templates", part: "The Hive", title: "Templates and repeating tasks", pose: "fly",
    what: "Save any team task as a template to reuse it in two clicks, or let it repeat every week or month.",
    steps: ["Open a team task and click Save as template.", "In the team's Templates tab, click Use template to make a copy.", "Set Repeats to every week or month, pick the day and time, and choose who gets it.", "Repeating tasks are created 3 days before they're due and emailed automatically."],
    try: { href: "/hive", label: "Go to my teams" } },
  { id: "yours", part: "Make it yours", title: "Themes, text size and profile", pose: "celebrate",
    what: "Choose a theme, a light or dark look, any accent colour and a bigger text size. Add a profile picture, a banner and a short description.",
    steps: ["Settings → Appearance for theme, text size and accent colour.", "Profile (or Me on a phone) for your picture, banner and description."],
    try: { href: "/profile", label: "Open my profile" } },
];

const KEY = "hive-tutorial-read";

export function Tutorial() {
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => { const t = setTimeout(() => setRead(JSON.parse(localStorage.getItem(KEY) ?? "[]"))); return () => clearTimeout(t); }, []);
  const toggle = (id: string) => setRead((r) => { const n = r.includes(id) ? r.filter((x) => x !== id) : [...r, id]; localStorage.setItem(KEY, JSON.stringify(n)); return n; });
  const pct = Math.round((100 * read.length) / CHAPTERS.length);
  const parts = [...new Set(CHAPTERS.map((c) => c.part))];

  return (
    <div className="grid gap-10 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside aria-label="Tutorial progress and chapters" className="lg:sticky lg:top-8 lg:self-start">
        <div className="flex items-center gap-4">
          <HexProgress value={pct} size={56} label="Tutorial progress" showValue={false} />
          <div>
            <h1 className="font-display text-3xl font-semibold">Tutorial</h1>
            <p className="text-sm text-muted">{read.length} of {CHAPTERS.length} read</p>
          </div>
        </div>
        <nav aria-label="Chapters" className="mt-6 hidden lg:block">
          {parts.map((part) => (
            <div key={part} className="mb-4">
              <p className="mb-1 text-sm font-semibold text-muted">{part}</p>
              <ol className="grid gap-0.5">
                {CHAPTERS.filter((c) => c.part === part).map((c) => (
                  <li key={c.id}>
                    <a href={`#${c.id}`} className="flex min-h-10 items-center gap-2 rounded-[var(--radius)] px-2 text-sm hover:bg-raised">
                      <span aria-hidden className={read.includes(c.id) ? "text-success" : "text-muted"}>{read.includes(c.id) ? "✓" : "○"}</span>{c.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <section className="flex flex-wrap items-center gap-5 rounded-[var(--radius)] border border-line bg-surface p-5 sm:p-6">
          <Bee pose="wave" size={88} animate />
          <div className="min-w-0 flex-1 basis-64">
            <p className="font-display text-xl font-semibold">Hi, I&apos;m Hexley. Let&apos;s look around.</p>
            <p className="mt-1 text-muted">{CHAPTERS.length} short chapters, about a minute each. Every chapter has a button that takes you to the right place, and you can come back here any time from the menu.</p>
          </div>
          <a href={`#${CHAPTERS.find((c) => !read.includes(c.id))?.id ?? CHAPTERS[0].id}`} className="inline-flex min-h-11 items-center rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">
            {read.length === 0 ? "Start the tour" : read.length === CHAPTERS.length ? "Read it again" : "Continue where I left off"}
          </a>
        </section>

        <ol className="mt-8 grid gap-6">
          {CHAPTERS.map((c, i) => (
            <li key={c.id} id={c.id} className="scroll-mt-6 rounded-[var(--radius)] border border-line bg-surface p-5 sm:p-7">
              <div className="flex flex-wrap items-start gap-5">
                <Bee pose={c.pose} size={64} className="shrink-0" />
                <div className="min-w-0 flex-1 basis-72">
                  <p className="text-sm text-muted">{c.part}, chapter {i + 1} of {CHAPTERS.length}</p>
                  <h2 className="font-display text-2xl font-semibold">{c.title}</h2>
                  <p className="mt-2 max-w-[65ch]">{c.what}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <h3 className="font-semibold">How</h3>
                  <ol className="mt-2 grid list-decimal gap-1.5 pl-5 marker:text-muted">{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                  {c.tip && <p className="mt-4 rounded-[var(--radius)] bg-raised p-3 text-sm"><span className="font-semibold">Tip: </span>{c.tip}</p>}
                </div>
                {c.demo && <div className="min-w-0 md:w-72"><Demo kind={c.demo} /></div>}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                {c.try && <Link href={c.try.href} className="inline-flex min-h-11 items-center rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">{c.try.label}</Link>}
                <label className="flex min-h-11 cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={read.includes(c.id)} onChange={() => toggle(c.id)} className="size-5 accent-[var(--accent)]" />
                  I&apos;ve got this
                </label>
                {i < CHAPTERS.length - 1 && <a href={`#${CHAPTERS[i + 1].id}`} className="ml-auto min-h-11 content-center rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm font-medium text-accent-text">Next: {CHAPTERS[i + 1].title} ↓</a>}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center text-muted">That&apos;s everything. <Link href="/cell" className="text-accent-text underline underline-offset-4">Back to My Cell</Link></p>
      </div>
    </div>
  );
}

/** Small, safe practice areas: nothing here saves anything. */
function Demo({ kind }: { kind: NonNullable<Chapter["demo"]> }) {
  const [v, setV] = useState(40);
  const [text, setText] = useState("Submit lab report Fri 5pm");
  const [ticks, setTicks] = useState([true, false, false]);
  // worked out in the browser only: it depends on today's date, which must not be baked into the page at build time
  const [preview, setPreview] = useState<ReturnType<typeof parseQuickAdd> | null>(null);
  useEffect(() => {
    if (kind !== "quickadd") return;
    const t = setTimeout(() => setPreview(text.trim() ? parseQuickAdd(text, Intl.DateTimeFormat().resolvedOptions().timeZone) : null));
    return () => clearTimeout(t);
  }, [kind, text]);
  const box = "rounded-[var(--radius)] border border-dashed border-line p-4";
  if (kind === "progress")
    return (
      <div className={box}>
        <p className="text-sm font-medium">Practice: drag to fill the cell</p>
        <div className="mt-3 flex items-center gap-4">
          <HexProgress value={v} size={64} label="Practice goal" />
          <input type="range" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} aria-label="Practice progress" className="w-full min-w-0 flex-1 accent-[var(--accent)]" />
        </div>
      </div>
    );
  if (kind === "tick")
    return (
      <div className={box}>
        <p className="text-sm font-medium">Practice: tick a task</p>
        <ul className="mt-2">
          {["Read chapter 3", "Make study notes", "Practice problems 1–10"].map((t, i) => (
            <li key={t} className="flex items-center gap-1">
              <HexCheck checked={ticks[i]} label={`Practice: ${t}`} onChange={(c) => setTicks((x) => x.map((y, j) => (j === i ? c : y)))} />
              <span className={ticks[i] ? "text-muted line-through" : ""}>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  if (kind === "quickadd") {
    const r = preview;
    return (
      <div className={box}>
        <label htmlFor="demo-qa" className="text-sm font-medium">Practice: type a task with a date</label>
        <input id="demo-qa" value={text} onChange={(e) => setText(e.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-base" />
        <p className="mt-2 text-sm" aria-live="polite">
          {r ? <>Title: <span className="font-medium">{r.title}</span><br />Due: <span className="font-medium">{r.dueAt ? formatDue(r.dueAt, r.hasTime, Intl.DateTimeFormat().resolvedOptions().timeZone) : "no date found"}</span></> : "Type something above."}
        </p>
      </div>
    );
  }
  return (
    <div className={box}>
      <p className="text-sm font-medium">What the board looks like</p>
      <table className="mt-2 w-full text-left text-sm">
        <thead className="text-muted"><tr><th scope="col" className="py-1 font-normal">Task</th><th scope="col" className="py-1 font-normal">Ana</th><th scope="col" className="py-1 font-normal">Ben</th></tr></thead>
        <tbody>
          <tr className="border-t border-line"><th scope="row" className="py-1.5 font-medium">Lab report</th><td className="text-success">✓ Done</td><td className="text-danger">! Overdue</td></tr>
          <tr className="border-t border-line"><th scope="row" className="py-1.5 font-medium">Slides</th><td className="text-muted">○ Pending</td><td className="text-success">✓ Done</td></tr>
        </tbody>
      </table>
    </div>
  );
}
