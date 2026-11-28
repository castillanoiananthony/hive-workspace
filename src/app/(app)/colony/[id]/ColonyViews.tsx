"use client";
import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { HexBadge } from "@/components/app/HexBadge";
import { WaggleButton } from "@/components/app/WaggleButton";
import { HexProgress } from "@/components/brand/HexProgress";
import { addMilestone, addStudentToSwarm, announce, assignProject, createPeerEval, createSwarm, deleteMilestone, joinSwarm, setPeerEval, submitPeerEval, updateColony } from "../actions";

type Milestone = { id: string; title: string; when: string; past: boolean };
type Post = { id: string; body: string; when: string };
type Base = { id: string; name: string; queen: string; selfSwarm: boolean; milestones: Milestone[]; posts: Post[] };
type SwarmMember = { id: string; name: string; leader: boolean; done: number };
type Swarm = { id: string; name: string; color: string; members: SwarmMember[]; progress: number; open: number; overdue: number; lastActivity: string | null; quiet: boolean };
type Student = { id: string; name: string; email: string; swarm: string | null };
type Eval = { id: string; title: string; criteria: string[]; open: boolean; showToStudents: boolean; responses: { teamId: string; rateeId: string; scores: number[]; comment: string | null }[] };

const card = "rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5 sm:p-6";
const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
const primary = "min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";
const outline = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>, ok?: string | ((r: unknown) => string)) => start(async () => {
    try { const r = await fn(); setMsg(typeof ok === "function" ? ok(r) : ok ?? null); router.refresh(); }
    catch (e) { unstable_rethrow(e); setMsg(e instanceof Error ? e.message : "Something went wrong."); }
  });
  return { pending, msg, run };
}

function Header({ name, sub, children }: { name: string; sub: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <HexBadge label={name} color="#F5B80B" size={56} />
        <div className="min-w-0"><h1 className="font-display text-3xl font-semibold [overflow-wrap:anywhere]">{name}</h1><p className="text-muted">{sub}</p></div>
      </div>
      {children}
    </div>
  );
}

function Milestones({ items }: { items: Milestone[] }) {
  if (!items.length) return <p className="text-muted">No milestones yet.</p>;
  return (
    <ol className="grid gap-2">
      {items.map((m) => (
        <li key={m.id} className={`flex items-center gap-3 rounded-[var(--radius)] border border-line px-4 py-3 ${m.past ? "opacity-60" : ""}`}>
          <span aria-hidden className="size-3 shrink-0 rotate-45 rounded-[2px] bg-accent" />
          <span className="min-w-0 flex-1 font-medium">{m.title}</span>
          <span className="text-sm text-muted">{m.past ? "Was due " : "Due "}{m.when}</span>
        </li>
      ))}
    </ol>
  );
}

function Posts({ items }: { items: Post[] }) {
  if (!items.length) return <p className="text-muted">No announcements yet.</p>;
  return <ol className="grid gap-3">{items.map((p) => <li key={p.id} className="rounded-[var(--radius)] border border-line p-4"><p className="whitespace-pre-line break-words">{p.body}</p><p className="mt-1 text-sm text-muted">{p.when}</p></li>)}</ol>;
}

// ---------------------------------------------------------------- Queen Bee

const TABS = ["Swarms", "Students", "Milestones", "Project", "Announcements", "Peer evaluation", "Class settings"] as const;

export function QueenView(p: Base & { code: string; swarms: Swarm[]; students: Student[]; evals: Eval[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Swarms");
  const [copied, setCopied] = useState(false);
  const quiet = p.swarms.filter((s) => s.quiet).length;
  return (
    <>
      <Header name={p.name} sub={`You're the Queen Bee. ${p.students.length} ${p.students.length === 1 ? "student" : "students"}, ${p.swarms.length} ${p.swarms.length === 1 ? "swarm" : "swarms"}.`}>
        <div className="rounded-[calc(var(--radius)*2)] border border-accent-edge/60 bg-surface px-5 py-3">
          <p className="text-sm text-muted">Class code</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-semibold tracking-[0.25em] text-accent-text">{p.code}</span>
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(p.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`${outline} min-h-10 px-3 text-sm`}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      </Header>
      {quiet > 0 && <p role="status" className="mt-5 rounded-[var(--radius)] border border-danger/50 bg-danger/10 px-4 py-3"><strong>{quiet} {quiet === 1 ? "swarm has" : "swarms have"} been quiet for 5 days or more.</strong> They&apos;re flagged below.</p>}
      <div role="tablist" aria-label="Class sections" className="relative mt-6 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 [scrollbar-width:none]">
        {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="min-h-10 shrink-0 rounded-full px-4 font-medium whitespace-nowrap text-muted hover:text-ink aria-selected:bg-accent aria-selected:font-semibold aria-selected:text-on-accent">{t}</button>)}
      </div>
      <div role="tabpanel" aria-label={tab} className="mt-6">
        {tab === "Swarms" && <SwarmsTab {...p} />}
        {tab === "Students" && <StudentsTab students={p.students} />}
        {tab === "Milestones" && <MilestonesTab id={p.id} items={p.milestones} />}
        {tab === "Project" && <ProjectTab id={p.id} swarms={p.swarms.length} />}
        {tab === "Announcements" && <AnnounceTab id={p.id} posts={p.posts} students={p.swarms.reduce((n, s) => n + s.members.length, 0)} />}
        {tab === "Peer evaluation" && <PeerTab id={p.id} evals={p.evals} swarms={p.swarms} />}
        {tab === "Class settings" && <SettingsTab id={p.id} name={p.name} selfSwarm={p.selfSwarm} />}
      </div>
    </>
  );
}

function SwarmsTab({ id, name, swarms, students }: { id: string; name: string; swarms: Swarm[]; students: Student[] }) {
  const { pending, msg, run } = useRun();
  const gc = [`🐝 ${name}: class update`, "", ...swarms.map((s) => `• ${s.name}: ${s.progress}% done${s.overdue ? `, ${s.overdue} overdue` : ""}${s.quiet ? ", quiet for 5+ days" : ""}`), "", "Check your swarm in HIVE-WORKSPACE."].join("\n");
  const free = students.filter((s) => !s.swarm);
  return (
    <div className="grid gap-6">
      <BusyOverlay show={pending} label="Saving…" />
      {swarms.length > 0 && <WaggleButton text={gc} label="Copy class update for GC" />}
      {swarms.length === 0 ? <p className={`${card} text-muted`}>No swarms yet. Make the first one below, or turn on &ldquo;Students form their own swarms&rdquo; in Class settings.</p> : (
        <div className={`${card} relative overflow-x-auto p-0 sm:p-0`}>
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <caption className="sr-only">Every swarm&apos;s progress</caption>
            <thead><tr className="border-b border-line text-sm text-muted"><th className="p-4 font-medium">Swarm</th><th className="p-4 font-medium">Progress</th><th className="p-4 font-medium">Open</th><th className="p-4 font-medium">Last activity</th><th className="p-4 font-medium"><span className="sr-only">Add a student</span></th></tr></thead>
            <tbody>
              {swarms.map((s) => (
                <tr key={s.id} className={`border-b border-line align-top last:border-0 ${s.quiet ? "bg-danger/5" : ""}`}>
                  <td className="p-4">
                    <Link href={`/hive/${s.id}`} className="flex items-center gap-3 font-semibold hover:underline"><HexBadge label={s.name} color={s.color} size={34} />{s.name}</Link>
                    <p className="mt-1 text-sm text-muted">{s.members.length ? s.members.map((m) => m.name + (m.leader ? " (leader)" : "")).join(", ") : "No students yet"}</p>
                  </td>
                  <td className="p-4"><span className="flex items-center gap-2"><HexProgress value={s.progress} size={40} label={`${s.name}: ${s.progress}% done`} showValue={false} /><span className="font-semibold tabular-nums">{s.progress}%</span></span></td>
                  <td className="p-4 text-sm tabular-nums">{s.open} open{s.overdue > 0 && <span className="block text-danger">{s.overdue} overdue</span>}</td>
                  <td className="p-4 text-sm">{s.lastActivity ?? "Nothing yet"}{s.quiet && <span className="mt-1 block w-fit rounded-full border border-danger/60 px-2 py-0.5 text-xs font-semibold text-danger">Quiet 5+ days</span>}</td>
                  <td className="p-4">
                    {free.length > 0 && (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const u = String(new FormData(e.currentTarget).get("u")); if (u) run(() => addStudentToSwarm(s.id, u), "Added."); }}>
                        <label className="sr-only" htmlFor={`add-${s.id}`}>Add a student to {s.name}</label>
                        <select id={`add-${s.id}`} name="u" className={`${field} min-h-10 max-w-44 text-sm`}><option value="">Add a student…</option>{free.map((f) => <option key={f.id} value={f.id}>{f.name || f.email}</option>)}</select>
                        <button disabled={pending} className={`${outline} min-h-10 px-3 text-sm`}>Add</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form className={`${card} grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end`} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget), form = e.currentTarget; run(async () => { await createSwarm(id, { name: String(f.get("name")), leaderId: String(f.get("leader")) }); form.reset(); }, "Swarm created."); }}>
        <h2 className="font-display text-lg font-semibold sm:col-span-3">New swarm</h2>
        <label className="grid gap-1"><span className="text-sm font-medium">Swarm name</span><input name="name" required maxLength={80} placeholder="Group 1" className={field} /></label>
        <label className="grid gap-1"><span className="text-sm font-medium">Leader</span>
          <select name="leader" required className={field}><option value="">{free.length ? "Pick a student…" : "Every student is in a swarm"}</option>{free.map((f) => <option key={f.id} value={f.id}>{f.name || f.email}</option>)}</select>
        </label>
        <button disabled={pending || !free.length} className={primary}>Create swarm</button>
        <p className="text-sm text-muted sm:col-span-3">The leader runs the swarm like any team. You join every swarm as an Adviser: you see their tasks and can comment, but can&apos;t edit their work.</p>
      </form>
      <p role="status" className="text-sm text-muted">{msg}</p>
    </div>
  );
}

function StudentsTab({ students }: { students: Student[] }) {
  if (!students.length) return <p className={`${card} text-muted`}>No students yet. Share the class code: students tap The Hive → Join a class and type it in.</p>;
  return (
    <ul className={`${card} divide-y divide-line p-0 sm:p-0`}>
      {students.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"><span className="min-w-0"><span className="block font-medium">{s.name || s.email}</span><span className="block truncate text-sm text-muted">{s.email}</span></span><span className={`text-sm ${s.swarm ? "" : "text-danger"}`}>{s.swarm ?? "No swarm yet"}</span></li>)}
    </ul>
  );
}

function MilestonesTab({ id, items }: { id: string; items: Milestone[] }) {
  const { pending, msg, run } = useRun();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className={card}><h2 className="font-display mb-3 text-lg font-semibold">Checkpoints</h2>
        <Milestones items={items} />
        {items.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{items.map((m) => <button key={m.id} type="button" disabled={pending} onClick={() => { if (confirm(`Remove the milestone “${m.title}”?`)) run(() => deleteMilestone(m.id)); }} className={`${outline} min-h-9 px-3 text-sm hover:border-danger hover:text-danger`}>Remove “{m.title}”</button>)}</div>}
      </section>
      <form className={`${card} grid content-start gap-3`} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget), form = e.currentTarget; run(async () => { await addMilestone(id, { title: String(f.get("title")), date: String(f.get("date")) }); form.reset(); }, "Milestone added to every swarm."); }}>
        <h2 className="font-display text-lg font-semibold">Add a milestone</h2>
        <label className="grid gap-1"><span className="text-sm font-medium">Checkpoint</span><input name="title" required maxLength={120} placeholder="Proposal submitted" className={field} /></label>
        <label className="grid gap-1"><span className="text-sm font-medium">Date</span><input name="date" type="date" required className={field} /></label>
        <button disabled={pending} className={primary}>Add to every swarm</button>
        <p role="status" className="text-sm text-muted">{msg}</p>
      </form>
    </div>
  );
}

function ProjectTab({ id, swarms }: { id: string; swarms: number }) {
  const { pending, msg, run } = useRun();
  const [rows, setRows] = useState([{ title: "", date: "", steps: "" }]);
  const set = (i: number, k: "title" | "date" | "steps", v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <form className={`${card} grid gap-4`} onSubmit={(e) => { e.preventDefault(); if (confirm(`Copy these ${rows.filter((r) => r.title.trim()).length} tasks into all ${swarms} swarms?`)) run(async () => { const r = await assignProject(id, rows); setRows([{ title: "", date: "", steps: "" }]); return r; }, (r) => { const x = r as { swarms: number; tasks: number }; return `Done: ${x.tasks} ${x.tasks === 1 ? "task" : "tasks"} added to each of ${x.swarms} swarms.`; }); }}>
      <BusyOverlay show={pending} label="Copying the project into every swarm…" />
      <div><h2 className="font-display text-lg font-semibold">Give every swarm the same project</h2>
        <p className="text-muted">Each swarm gets its own copy of these tasks. Their leader splits them into subtasks and assigns them.</p></div>
      <ol className="grid gap-3">
        {rows.map((r, i) => (
          <li key={i} className="grid gap-2 rounded-[var(--radius)] border border-line p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
            <label className="sr-only" htmlFor={`pt-${i}`}>Task {i + 1}</label>
            <input id={`pt-${i}`} value={r.title} onChange={(e) => set(i, "title", e.target.value)} maxLength={200} placeholder={`Task ${i + 1}, e.g. Write the proposal`} className={field} />
            <label className="sr-only" htmlFor={`pd-${i}`}>Due date for task {i + 1}</label>
            <input id={`pd-${i}`} type="date" value={r.date} onChange={(e) => set(i, "date", e.target.value)} className={field} />
            <button type="button" aria-label={`Remove task ${i + 1}`} onClick={() => setRows((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : x))} className={`${outline} px-3`}>×</button>
            <label className="sr-only" htmlFor={`ps-${i}`}>Steps for task {i + 1}</label>
            <textarea id={`ps-${i}`} value={r.steps} onChange={(e) => set(i, "steps", e.target.value)} rows={2} maxLength={4000} placeholder="Steps or instructions (optional)" className={`${field} py-2 sm:col-span-3`} />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {rows.length < 30 && <button type="button" onClick={() => setRows((x) => [...x, { title: "", date: "", steps: "" }])} className={outline}>+ Add a task</button>}
        <button disabled={pending || !swarms || !rows.some((r) => r.title.trim())} className={primary}>Assign to all {swarms} {swarms === 1 ? "swarm" : "swarms"}</button>
      </div>
      <p role="status" className="text-sm text-muted">{msg}</p>
    </form>
  );
}

function AnnounceTab({ id, posts, students }: { id: string; posts: Post[]; students: number }) {
  const { pending, msg, run } = useRun();
  const [body, setBody] = useState("");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form className={`${card} grid content-start gap-3`} onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await announce(id, body); setBody(""); return r; }, (r) => { const x = r as { swarms: number; emailed: number; skipped: number }; return `Posted to ${x.swarms} swarms and emailed ${x.emailed} ${x.emailed === 1 ? "student" : "students"}.${x.skipped ? ` ${x.skipped} more will see it in the app (daily email limit).` : ""}`; }); }}>
        <BusyOverlay show={pending} label="Sending the announcement…" />
        <h2 className="font-display text-lg font-semibold">New announcement</h2>
        <label htmlFor="ann" className="text-sm text-muted">Goes on every swarm&apos;s Comb and by email to the {students} {students === 1 ? "student" : "students"} in swarms (except anyone who turned Buzz off).</label>
        <textarea id="ann" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} placeholder="Reminder: proposals are due Friday, 5 PM. Submit in your swarm's Hive Vault." className={`${field} py-2`} />
        <button disabled={pending || !body.trim()} className={primary}>Post and email</button>
        <p role="status" className="text-sm text-muted">{msg}</p>
      </form>
      <section className={card}><h2 className="font-display mb-3 text-lg font-semibold">Sent</h2><Posts items={posts} /></section>
    </div>
  );
}

function PeerTab({ id, evals, swarms }: { id: string; evals: Eval[]; swarms: Swarm[] }) {
  const { pending, msg, run } = useRun();
  return (
    <div className="grid gap-6">
      <form className={`${card} grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end`} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => createPeerEval(id, { title: String(f.get("title")) }), "Evaluation opened. Students see it on the class page."); }}>
        <label className="grid gap-1"><span className="text-sm font-medium">New peer evaluation</span><input name="title" maxLength={120} placeholder="End of project: Experiment 4" className={field} /></label>
        <button disabled={pending} className={primary}>Open evaluation</button>
        <p className="text-sm text-muted sm:col-span-2">Students rate each swarm-mate 1–5 on: did their share, quality, communication and meeting deadlines, plus an optional comment. Only you see individual answers.</p>
      </form>
      <p role="status" className="text-sm text-muted">{msg}</p>
      {evals.map((e) => (
        <section key={e.id} className={card} aria-label={e.title}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">{e.title} <span className="text-sm font-normal text-muted">{e.open ? "Open" : "Closed"}, {new Set(e.responses.map((r) => r.teamId + r.rateeId)).size} people rated</span></h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => setPeerEval(e.id, { open: !e.open }))} className={`${outline} min-h-10 text-sm`}>{e.open ? "Close it" : "Reopen"}</button>
              <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={e.showToStudents} disabled={pending} onChange={(x) => run(() => setPeerEval(e.id, { showToStudents: x.target.checked }))} className="size-5 accent-[var(--accent)]" /> Students see their own averages</label>
            </div>
          </div>
          {swarms.map((s) => (
            <div key={s.id} className="relative mt-5 overflow-x-auto">
              <h3 className="font-semibold">{s.name}</h3>
              <table className="mt-2 w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead><tr className="border-b border-line text-muted"><th className="py-2 pr-3 font-medium">Student</th><th className="py-2 pr-3 font-medium">Contributions</th>{e.criteria.map((c) => <th key={c} className="py-2 pr-3 font-medium">{c}</th>)}<th className="py-2 font-medium">Comments</th></tr></thead>
                <tbody>
                  {s.members.map((m) => { const rs = e.responses.filter((r) => r.rateeId === m.id); return (
                    <tr key={m.id} className="border-b border-line align-top">
                      <td className="py-2 pr-3 font-medium">{m.name}</td>
                      <td className="py-2 pr-3 tabular-nums">{m.done}</td>
                      {e.criteria.map((c, i) => <td key={c} className="py-2 pr-3 tabular-nums">{avg(rs.map((r) => r.scores[i])) ?? "–"}</td>)}
                      <td className="py-2">{rs.filter((r) => r.comment).map((r, i) => <p key={i} className="text-muted">“{r.comment}”</p>)}{!rs.length && <span className="text-muted">No ratings yet</span>}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function SettingsTab({ id, name, selfSwarm }: { id: string; name: string; selfSwarm: boolean }) {
  const { pending, msg, run } = useRun();
  return (
    <form className={`${card} grid max-w-xl gap-4`} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => updateColony(id, { name: String(f.get("name")), selfSwarm: f.get("self") === "on" }), "Saved."); }}>
      <label className="grid gap-1"><span className="font-medium">Class name</span><input name="name" defaultValue={name} required maxLength={80} className={field} /></label>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="self" defaultChecked={selfSwarm} className="size-5 accent-[var(--accent)]" /> Students form their own swarms (they create one, or join one that exists)</label>
      <div className="flex flex-wrap gap-2">
        <button disabled={pending} className={primary}>Save</button>
        <button type="button" disabled={pending} onClick={() => { if (confirm("Make a new class code? The old one stops working.")) run(() => updateColony(id, { newCode: true }), "New code made."); }} className={outline}>New class code</button>
      </div>
      <p role="status" className="text-sm text-muted">{msg}</p>
    </form>
  );
}

// ---------------------------------------------------------------- Student

type StudentEval = { id: string; title: string; criteria: string[]; open: boolean; mine: { rateeId: string; scores: number[]; comment: string | null }[]; aboutMe: number[][] | null };

export function StudentView(p: Base & { swarm: { id: string; name: string; mates: { id: string; name: string }[] } | null; openSwarms: { id: string; name: string; members: number }[]; evals: StudentEval[] }) {
  const { pending, msg, run } = useRun();
  return (
    <>
      <BusyOverlay show={pending} label="Saving…" />
      <Header name={p.name} sub={`Queen Bee: ${p.queen}`} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={card} aria-labelledby="my-swarm">
          <h2 id="my-swarm" className="font-display text-lg font-semibold">Your swarm</h2>
          {p.swarm ? (
            <Link href={`/hive/${p.swarm.id}`} className="mt-3 flex items-center gap-3 rounded-[var(--radius)] border border-accent-edge/60 p-4 hover:bg-raised">
              <HexBadge label={p.swarm.name} color="#F5B80B" size={44} />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{p.swarm.name}</span><span className="block text-sm text-muted">{p.swarm.mates.length ? `With ${p.swarm.mates.map((m) => m.name).join(", ")}` : "Just you so far"}</span></span>
              <span aria-hidden>›</span>
            </Link>
          ) : p.selfSwarm ? (
            <div className="mt-3 grid gap-4">
              {p.openSwarms.length > 0 && <ul className="grid gap-2">{p.openSwarms.map((s) => <li key={s.id} className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line px-4 py-3"><span><span className="font-medium">{s.name}</span> <span className="text-sm text-muted">{s.members} {s.members === 1 ? "member" : "members"}</span></span><button type="button" disabled={pending} onClick={() => run(() => joinSwarm(s.id))} className={`${outline} min-h-10 text-sm`}>Join</button></li>)}</ul>}
              <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("name")); run(() => createSwarm(p.id, { name: n })); }}>
                <label className="sr-only" htmlFor="sw-name">New swarm name</label>
                <input id="sw-name" name="name" required maxLength={80} placeholder="Name a new swarm" className={`${field} min-w-0 flex-1`} />
                <button disabled={pending} className={primary}>Start a swarm</button>
              </form>
            </div>
          ) : <p className="mt-2 text-muted">Your Queen Bee will put you in a swarm soon. You&apos;ll find it here and in The Hive.</p>}
        </section>
        <section className={card} aria-labelledby="ms-h"><h2 id="ms-h" className="font-display mb-3 text-lg font-semibold">Milestones</h2><Milestones items={p.milestones} /></section>
        <section className={card} aria-labelledby="ann-h"><h2 id="ann-h" className="font-display mb-3 text-lg font-semibold">Announcements</h2><Posts items={p.posts} /></section>
        {p.evals.map((e) => <PeerForm key={e.id} e={e} mates={p.swarm?.mates ?? []} pending={pending} onSubmit={(ratings) => run(() => submitPeerEval(e.id, ratings), "Thanks! Your evaluation is saved.")} />)}
      </div>
      <p role="status" className="mt-3 text-sm text-muted">{msg}</p>
    </>
  );
}

function PeerForm({ e, mates, pending, onSubmit }: { e: StudentEval; mates: { id: string; name: string }[]; pending: boolean; onSubmit: (r: { rateeId: string; scores: number[]; comment: string }[]) => void }) {
  const init = Object.fromEntries(mates.map((m) => { const prev = e.mine.find((x) => x.rateeId === m.id); return [m.id, { scores: e.criteria.map((_, i) => prev?.scores[i] ?? 0), comment: prev?.comment ?? "" }]; }));
  const [v, setV] = useState(init);
  const done = mates.every((m) => v[m.id]?.scores.every((s) => s > 0));
  return (
    <section className={`${card} lg:col-span-2`} aria-labelledby={`pe-${e.id}`}>
      <h2 id={`pe-${e.id}`} className="font-display text-lg font-semibold">{e.title}</h2>
      {e.aboutMe && <p className="mt-1 text-sm">Your averages from teammates: {e.criteria.map((c, i) => `${c}: ${avg(e.aboutMe!.map((s) => s[i])) ?? "–"}`).join(", ")}</p>}
      {!e.open ? <p className="mt-2 text-muted">This evaluation is closed.</p> : !mates.length ? <p className="mt-2 text-muted">Join a swarm to rate your swarm-mates.</p> : (
        <form className="mt-3 grid gap-4" onSubmit={(x) => { x.preventDefault(); onSubmit(mates.map((m) => ({ rateeId: m.id, ...v[m.id] }))); }}>
          <p className="text-sm text-muted">1 = not at all, 5 = excellent. Only your Queen Bee sees individual answers.{e.mine.length ? " You can change your answers until it closes." : ""}</p>
          {mates.map((m) => (
            <fieldset key={m.id} className="grid gap-2 rounded-[var(--radius)] border border-line p-4">
              <legend className="px-1 font-semibold">{m.name}</legend>
              {e.criteria.map((c, i) => (
                <div key={c} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">{c}</span>
                  <span role="radiogroup" aria-label={`${c}, ${m.name}`} className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={v[m.id].scores[i] === n} aria-label={`${n}`} onClick={() => setV((s) => ({ ...s, [m.id]: { ...s[m.id], scores: s[m.id].scores.map((x, j) => (j === i ? n : x)) } }))}
                        className="grid size-10 place-items-center rounded-[var(--radius)] border border-line text-sm font-semibold aria-checked:border-accent-edge aria-checked:bg-accent aria-checked:text-on-accent">{n}</button>
                    ))}
                  </span>
                </div>
              ))}
              <label className="grid gap-1"><span className="text-sm text-muted">Comment (optional)</span><input value={v[m.id].comment} onChange={(x) => setV((s) => ({ ...s, [m.id]: { ...s[m.id], comment: x.target.value } }))} maxLength={500} className={field} /></label>
            </fieldset>
          ))}
          <button disabled={pending || !done} className={`${primary} justify-self-start`}>{e.mine.length ? "Update my evaluation" : "Submit evaluation"}</button>
          {!done && <p className="text-sm text-muted">Pick a score for every question to submit.</p>}
        </form>
      )}
    </section>
  );
}
