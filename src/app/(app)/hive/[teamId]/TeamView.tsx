"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { HexBadge } from "@/components/app/HexBadge";
import { formatDue } from "@/lib/dates";
import { addMembers, deleteTeam, deleteTemplate, newTeamTask, removeMember, renameMember, updateTeam, updateTemplate } from "../actions";
import { ColorPicker } from "../NewTeam";

type Team = { id: string; name: string; color: string; digestEnabled: boolean; digestDay: number };
type Member = { id: string; name: string; email: string; unsubscribed: boolean };
type Task = { id: string; title: string; status: "todo" | "doing" | "done"; dueAt: string | null; hasTime: boolean };
type Assigned = { taskId: string; memberId: string; doneAt: string | null };
type Template = { id: string; title: string; recurrence: "none" | "weekly" | "monthly"; weekday: number | null; monthDay: number | null; dueTime: string | null; assignAll: boolean; memberIds: string[]; checklist: number; links: number };

const TABS = [["board", "Tasks"], ["roster", "Roster"], ["templates", "Templates"], ["log", "Email log"], ["settings", "Team settings"]] as const;
type LogRow = { id: string; kind: "assign" | "remind3" | "remind1" | "digest"; recipient: string; status: "queued" | "sent" | "failed"; error: string | null; at: string; name: string | null; task: string | null };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const btnPrimary = "min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";
const btn = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";

export function TeamView(props: { team: Team; members: Member[]; tasks: Task[]; assigned: Assigned[]; templates: Template[]; log: LogRow[]; tz: string }) {
  const { team, members, tasks } = props;
  const [tab, setTab] = useState<(typeof TABS)[number][0]>(members.length ? "board" : "roster");
  const [pending, start] = useTransition();
  const open = tasks.filter((t) => t.status !== "done").length;
  return (
    <>
      <Link href="/hive" className="text-sm text-muted hover:text-ink">← The Hive</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <HexBadge label={team.name} color={team.color} size={56} />
          <div>
            <h1 className="font-display text-3xl font-semibold">{team.name}</h1>
            <p className="text-muted">{members.length} {members.length === 1 ? "member" : "members"}, {open} open {open === 1 ? "task" : "tasks"}</p>
          </div>
        </div>
        <button type="button" disabled={pending} onClick={() => start(() => newTeamTask(team.id))} className={btnPrimary}>New team task</button>
      </div>

      <div role="tablist" aria-label="Team sections" className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}
            className="min-h-11 shrink-0 border-b-2 border-transparent px-4 font-medium text-muted aria-selected:border-accent-edge aria-selected:text-ink">{label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "board" && <Board {...props} onRoster={() => setTab("roster")} />}
        {tab === "roster" && <Roster team={team} members={members} />}
        {tab === "templates" && <Templates team={team} members={members} templates={props.templates} />}
        {tab === "log" && <EmailLog log={props.log} tz={props.tz} />}
        {tab === "settings" && <Settings team={team} />}
      </div>
    </>
  );
}

// ---------- status board: tasks × members ----------

function Board({ team, members, tasks, assigned, tz, onRoster }: { team: Team; members: Member[]; tasks: Task[]; assigned: Assigned[]; tz: string; onRoster: () => void }) {
  const [now] = useState(() => Date.now());
  const [pending, start] = useTransition();
  if (members.length === 0) return <EmptyState pose="idle" title="Add your teammates first" body="Paste their email addresses and you can start assigning tasks." action={<button type="button" onClick={onRoster} className={btnPrimary}>Add members</button>} />;
  if (tasks.length === 0) return <EmptyState title="No team tasks yet" body="Make a task, pick who does it and add the steps under “How to do it”. Phase 5 emails it to them." action={<button type="button" disabled={pending} onClick={() => start(() => newTeamTask(team.id))} className={btnPrimary}>New team task</button>} />;

  const state = (t: Task, m: Member): "done" | "overdue" | "pending" | null => {
    const a = assigned.find((x) => x.taskId === t.id && x.memberId === m.id);
    if (!a) return null;
    if (a.doneAt) return "done";
    return t.dueAt && new Date(t.dueAt).getTime() < now ? "overdue" : "pending";
  };
  const pct = (m: Member) => {
    const mine = tasks.map((t) => state(t, m)).filter(Boolean);
    return mine.length ? Math.round((100 * mine.filter((s) => s === "done").length) / mine.length) : null;
  };
  const LABEL = { done: "Done", overdue: "Overdue", pending: "Pending" } as const;
  const chip = (s: NonNullable<ReturnType<typeof state>>) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ${s === "done" ? "bg-success/15 text-success" : s === "overdue" ? "bg-danger/15 text-danger" : "bg-raised text-muted"}`}>
      <span aria-hidden>{s === "done" ? "✓" : s === "overdue" ? "!" : "○"}</span>{LABEL[s]}
    </span>
  );

  return (
    <>
      {/* wide screens: grid of tasks × members */}
      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-line md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Status of every task for every member</caption>
          <thead className="bg-surface">
            <tr>
              <th scope="col" className="min-w-56 p-3 font-semibold">Task</th>
              {members.map((m) => (
                <th key={m.id} scope="col" className="min-w-32 p-3 align-bottom font-medium">
                  <span className="flex items-center gap-2"><HexBadge label={m.name} color={team.color} size={28} />{m.name}</span>
                  <span className="mt-1 block text-sm font-normal text-muted">{pct(m) === null ? "No tasks" : `${pct(m)}% done`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <th scope="row" className="p-3 font-medium">
                  <Link href={`/tasks/${t.id}`} className="hover:underline">{t.title || "Untitled task"}</Link>
                  {t.dueAt && <span className="block text-sm font-normal text-muted">Due {formatDue(new Date(t.dueAt), t.hasTime, tz)}</span>}
                </th>
                {members.map((m) => {
                  const s = state(t, m);
                  return <td key={m.id} className="p-3">{s ? chip(s) : <span className="text-muted" aria-label="Not assigned">–</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phones: one card per task, assignees stacked */}
      <ul className="grid gap-3 md:hidden">
        {tasks.map((t) => (
          <li key={t.id} className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <Link href={`/tasks/${t.id}`} className="font-medium hover:underline">{t.title || "Untitled task"}</Link>
            {t.dueAt && <p className="text-sm text-muted">Due {formatDue(new Date(t.dueAt), t.hasTime, tz)}</p>}
            <ul className="mt-3 grid gap-2">
              {members.filter((m) => state(t, m)).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3"><span>{m.name}</span>{chip(state(t, m)!)}</li>
              ))}
              {!members.some((m) => state(t, m)) && <li className="text-sm text-muted">Nobody assigned yet.</li>}
            </ul>
          </li>
        ))}
      </ul>
      <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 md:hidden">
        {members.map((m) => <div key={m.id} className="text-sm"><dt className="inline">{m.name}: </dt><dd className="inline text-muted">{pct(m) === null ? "no tasks" : `${pct(m)}% done`}</dd></div>)}
      </dl>
    </>
  );
}

// ---------- roster ----------

function Roster({ team, members }: { team: Team; members: Member[] }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const r = await addMembers(team.id, input);
        const parts = [
          r.added.length ? `Added ${r.added.length} ${r.added.length === 1 ? "member" : "members"}.` : "Nobody new to add.",
          r.duplicates.length ? `Skipped ${r.duplicates.length} already on the team.` : "",
          r.invalid.length ? `These don't look like email addresses: ${r.invalid.join(", ")}.` : "",
          r.overLimit ? `${r.overLimit} left out: a team can have up to 200 members.` : "",
        ];
        setReport(parts.filter(Boolean).join(" "));
        setInput(r.invalid.join("\n")); // keep only what needs fixing
        router.refresh();
      } catch (err) {
        setReport(err instanceof Error ? err.message : "Couldn't add members.");
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="members-h">
        <h2 id="members-h" className="font-display text-xl font-semibold">Members</h2>
        {members.length === 0 ? (
          <p className="mt-3 text-muted">No members yet. Add their emails on the right; they don&apos;t need an account.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
            {members.map((m) => <MemberRow key={m.id} member={m} color={team.color} />)}
          </ul>
        )}
      </section>
      <form onSubmit={add} className="grid content-start gap-3 rounded-[var(--radius)] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-semibold">Add members</h2>
        <label htmlFor="emails" className="text-sm text-muted">One email or many. Separate them with commas or new lines. “Ana Cruz &lt;ana@school.edu&gt;” keeps the name.</label>
        <textarea id="emails" value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder={"ana@school.edu, ben@school.edu\nCarla Reyes <carla@school.edu>"} className={`${field} py-2`} />
        <button disabled={pending || !input.trim()} className={btnPrimary}>{pending ? "Adding…" : "Add to team"}</button>
        <p role="status" className="text-sm text-muted">{report}</p>
      </form>
    </div>
  );
}

function MemberRow({ member: m, color }: { member: Member; color: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <HexBadge label={m.name} color={color} size={36} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("n")); start(async () => { await renameMember(m.id, n); setEditing(false); router.refresh(); }); }} className="flex gap-2">
            <label className="sr-only" htmlFor={`n-${m.id}`}>Name</label>
            <input id={`n-${m.id}`} name="n" defaultValue={m.name} autoFocus maxLength={80} className={`${field} min-w-0 flex-1`} />
            <button disabled={pending} className={btn}>Save</button>
          </form>
        ) : (
          <>
            <p className="font-medium">{m.name}</p>
            <p className="truncate text-sm text-muted">{m.email}{m.unsubscribed ? ". Turned off Buzz emails" : ""}</p>
          </>
        )}
      </div>
      {!editing && <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-2 text-sm text-muted hover:text-ink">Rename</button>}
      <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove ${m.name} from the team? Their task assignments are removed too.`)) start(async () => { await removeMember(m.id); router.refresh(); }); }}
        className="min-h-11 px-2 text-sm text-muted hover:text-danger">Remove</button>
    </li>
  );
}

// ---------- templates ----------

function Templates({ team, members, templates }: { team: Team; members: Member[]; templates: Template[] }) {
  const [pending, start] = useTransition();
  if (templates.length === 0)
    return <EmptyState pose="idle" title="No templates yet" body="Open any team task and choose “Save as template”. Then you can reuse it in two clicks, or make it repeat every week or month." />;
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {templates.map((t) => (
        <li key={t.id} className="rounded-[var(--radius)] border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{t.title}</h3>
              <p className="text-sm text-muted">{t.checklist} checklist {t.checklist === 1 ? "item" : "items"}, {t.links} {t.links === 1 ? "link" : "links"}</p>
            </div>
            <button type="button" disabled={pending} onClick={() => start(() => newTeamTask(team.id, t.id))} className={btnPrimary}>Use template</button>
          </div>
          <Recurrence template={t} members={members} />
          <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete the template “${t.title}”? Tasks made from it stay.`)) start(() => deleteTemplate(t.id)); }} className="mt-3 min-h-11 text-sm text-muted hover:text-danger">Delete template</button>
        </li>
      ))}
    </ul>
  );
}

function Recurrence({ template: t, members }: { template: Template; members: Member[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const recurrence = f.get("recurrence") as Template["recurrence"];
    const assignAll = f.get("who") === "all";
    start(async () => {
      await updateTemplate(t.id, {
        recurrence, weekday: Number(f.get("weekday")), monthDay: Number(f.get("monthDay")), dueTime: String(f.get("dueTime") || "") || null,
        assignAll, memberIds: assignAll ? [] : f.getAll("member").map(String),
      });
      setSaved(recurrence === "none" ? "Saved. It won't repeat." : "Saved. New tasks are created automatically once Buzz is switched on (Phase 5).");
      router.refresh();
    });
  }
  const [rec, setRec] = useState(t.recurrence);
  const [who, setWho] = useState(t.assignAll ? "all" : "some");
  return (
    <form onSubmit={save} className="mt-4 grid gap-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`rec-${t.id}`} className="text-sm font-medium">Repeats</label>
        <select id={`rec-${t.id}`} name="recurrence" value={rec} onChange={(e) => setRec(e.target.value as Template["recurrence"])} className={field}>
          <option value="none">Never</option><option value="weekly">Every week</option><option value="monthly">Every month</option>
        </select>
        {rec === "weekly" && (<><label className="sr-only" htmlFor={`wd-${t.id}`}>Day of the week</label><select id={`wd-${t.id}`} name="weekday" defaultValue={t.weekday ?? 5} className={field}>{DAYS.map((d, i) => <option key={d} value={i}>on {d}</option>)}</select></>)}
        {rec === "monthly" && (<><label className="sr-only" htmlFor={`md-${t.id}`}>Day of the month</label><select id={`md-${t.id}`} name="monthDay" defaultValue={t.monthDay ?? 1} className={field}>{Array.from({ length: 28 }, (_, i) => <option key={i} value={i + 1}>on day {i + 1}</option>)}</select></>)}
        {rec !== "none" && (<><label className="text-sm" htmlFor={`dt-${t.id}`}>due at</label><input id={`dt-${t.id}`} type="time" name="dueTime" defaultValue={t.dueTime ?? "17:00"} className={field} /></>)}
      </div>
      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <legend className="mb-1 text-sm font-medium">Assign to</legend>
        <label className="flex min-h-11 items-center gap-2"><input type="radio" name="who" value="all" checked={who === "all"} onChange={() => setWho("all")} className="accent-[var(--accent)]" /> Whole team</label>
        <label className="flex min-h-11 items-center gap-2"><input type="radio" name="who" value="some" checked={who === "some"} onChange={() => setWho("some")} className="accent-[var(--accent)]" /> Only…</label>
        {who === "some" && members.map((m) => (
          <label key={m.id} className="flex min-h-11 items-center gap-2"><input type="checkbox" name="member" value={m.id} defaultChecked={t.memberIds.includes(m.id)} className="size-4 accent-[var(--accent)]" />{m.name}</label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={btn}>Save schedule</button>
        <p role="status" className="text-sm text-muted">{saved}</p>
      </div>
    </form>
  );
}

// ---------- email log ----------

const KIND = { assign: "New task", remind3: "Reminder", remind1: "Last reminder", digest: "Weekly digest" } as const;

function EmailLog({ log, tz }: { log: LogRow[]; tz: string }) {
  if (log.length === 0) return <EmptyState pose="fly" title="No emails yet" body="Every Buzz email this team sends shows up here: who got it, what it was, when, and whether it went through." />;
  const when = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-line">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Emails sent to this team, newest first</caption>
        <thead className="bg-surface text-sm text-muted"><tr><th scope="col" className="p-3 font-medium">When</th><th scope="col" className="p-3 font-medium">To</th><th scope="col" className="p-3 font-medium">Email</th><th scope="col" className="p-3 font-medium">Status</th></tr></thead>
        <tbody>
          {log.map((l) => (
            <tr key={l.id} className="border-t border-line align-top">
              <td className="p-3 whitespace-nowrap text-sm">{when(l.at)}</td>
              <td className="p-3"><span className="block">{l.name ?? "Removed member"}</span><span className="block text-sm break-all text-muted">{l.recipient}</span></td>
              <td className="p-3"><span className="block">{KIND[l.kind]}</span>{l.task && <span className="block text-sm text-muted">{l.task}</span>}</td>
              <td className="p-3">
                {l.status === "sent" ? <span className="text-success">✓ Sent</span> : l.status === "failed" ? <span className="text-danger" title={l.error ?? undefined}>! Failed, will retry</span> : <span className="text-muted">Sending…</span>}
                {l.status === "failed" && l.error && <span className="block max-w-xs text-sm text-muted">{l.error}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- settings ----------

function Settings({ team }: { team: Team }) {
  const router = useRouter();
  const [color, setColor] = useState(team.color);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="grid max-w-2xl gap-10">
      <form className="grid gap-4" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          try {
            await updateTeam(team.id, { name: String(f.get("name")), color, digestEnabled: f.get("digest") === "on", digestDay: Number(f.get("digestDay")) });
            setMsg("Saved."); router.refresh();
          } catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't save."); }
        });
      }}>
        <label className="grid gap-2"><span className="font-medium">Team name</span><input name="name" defaultValue={team.name} maxLength={80} required className={field} /></label>
        <ColorPicker value={color} onChange={setColor} />
        <fieldset className="grid gap-2 rounded-[var(--radius)] border border-line p-4">
          <legend className="px-1 font-medium">Weekly digest</legend>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="digest" defaultChecked={team.digestEnabled} className="size-5 accent-[var(--accent)]" /> Email everyone a summary each week</label>
          <label className="flex flex-wrap items-center gap-2 text-sm">Send it on
            <select name="digestDay" defaultValue={team.digestDay} className={field}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
            at 8:00 in the morning (your time zone)
          </label>
          <p className="text-sm text-muted">It lists open tasks, what&apos;s due this week and what&apos;s overdue. Emails start once Buzz is set up (Phase 5).</p>
        </fieldset>
        <div className="flex items-center gap-3"><button disabled={pending} className={btnPrimary}>Save changes</button><p role="status" className="text-sm text-muted">{msg}</p></div>
      </form>

      <section aria-labelledby="danger-h" className="grid gap-3 rounded-[var(--radius)] border border-danger/50 p-5">
        <h2 id="danger-h" className="font-semibold text-danger">Delete this team</h2>
        <p className="text-sm text-muted">This deletes the team&apos;s tasks, roster and templates. It can&apos;t be undone. Type <strong className="text-ink">{team.name}</strong> to confirm.</p>
        <label className="sr-only" htmlFor="confirm-name">Team name</label>
        <input id="confirm-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className={field} autoComplete="off" />
        <button type="button" disabled={pending || confirmName.trim() !== team.name} onClick={() => start(() => deleteTeam(team.id, confirmName))}
          className="min-h-11 justify-self-start rounded-[var(--radius)] border border-danger px-4 font-medium text-danger disabled:opacity-50">Delete team for good</button>
      </section>
    </div>
  );
}
