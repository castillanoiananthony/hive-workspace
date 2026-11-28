"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { HexBadge } from "@/components/app/HexBadge";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { IMPORTANCE } from "@/lib/importance";
import { deleteTeam, deleteTemplate, newTeamTask, updateTeam, updateTemplate } from "../actions";
import { ColorPicker } from "../NewTeam";
import { Comb } from "./Comb";
import { Hierarchy } from "./Hierarchy";
import { Members } from "./Members";
import { Roles } from "./Roles";
import { Vault, type VaultLink } from "./Vault";
import { Board } from "./TeamTasks";
import { Activity, type DayT } from "./Activity";
import { HiveCalendar, type CalTask } from "../../calendar/HiveCalendar";
import { has, nameOf, type AssignedT, type MeT, type MemberT, type RoleT, type StreamT, type TaskT, type TeamT, type LogT, type ContributionT, type HiveMilestoneT, type ChecklistT } from "./types";
import { Countdown, Plan } from "./Plan";
import { setArchived } from "../dev-actions";

type Team = TeamT;
type Member = MemberT;
type Task = TaskT;
type Assigned = AssignedT;
type Template = { id: string; title: string; recurrence: "none" | "weekly" | "monthly"; weekday: number | null; monthDay: number | null; dueTime: string | null; assignAll: boolean; memberIds: string[]; checklist: number; links: number };
type LogRow = { id: string; kind: "assign" | "remind3" | "remind1" | "digest" | "invite" | "announce" | "remind0" | "help" | "daily" | "subtask"; recipient: string; status: "queued" | "sent" | "failed"; error: string | null; at: string; name: string | null; task: string | null };
type Props = { team: Team; members: Member[]; roles: RoleT[]; me: MeT; tasks: Task[]; assigned: Assigned[]; stream: StreamT[]; templates: Template[]; log: LogRow[]; links: VaultLink[]; tz: string; days: DayT[]; calendar: CalTask[]; logs: LogT[]; contributions?: ContributionT[]; hiveMilestones?: HiveMilestoneT[]; checklists?: ChecklistT[]; colonyInfo?: { id: string; name: string; milestones: { id: string; title: string; date: string; label: string }[] } | null };

// tabs a member can see; some only appear with the matching power
const TABS: { id: string; label: string; need?: string }[] = [
  { id: "comb", label: "The Comb" }, { id: "board", label: "Tasks" }, { id: "plan", label: "Milestones" }, { id: "calendar", label: "Calendar" }, { id: "activity", label: "Activity" }, { id: "vault", label: "Hive Vault" }, { id: "hierarchy", label: "Hierarchy" }, { id: "members", label: "Members" },
  { id: "templates", label: "Templates", need: "templates" }, { id: "log", label: "Email log", need: "log" }, { id: "settings", label: "Team settings", need: "settings" },
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const btnPrimary = "min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";
const btn = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";

export function TeamView(props: Props) {
  const { team, members, tasks } = props;
  const leader = props.me.isAdmin;
  // an archived hive is read-only for everyone (the Leader brings it back from the banner)
  const me = team.archived ? { ...props.me, perms: [], isAdmin: false } : props.me;
  const tabs = TABS.filter((t) => (me.access === "guest" ? ["comb", "board"].includes(t.id) : !t.need || has(me, t.need) || (t.id === "settings" && me.isAdmin)));
  const [tab, setTab] = useState("comb");
  const [pending, start] = useTransition();
  const open = tasks.filter((t) => t.status !== "done").length;
  const joined = members.filter((m) => m.joined).length;
  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <HexBadge label={team.name} color={team.color} size={56} />
          <div>
            <h1 className="font-display text-3xl font-semibold">{team.name}</h1>
            <p className="text-muted">{joined} {joined === 1 ? "member" : "members"}{members.length > joined ? `, ${members.length - joined} invited` : ""}, {open} open {open === 1 ? "task" : "tasks"}</p>
          </div>
        </div>
        {has(me, "tasks") && <button type="button" disabled={pending} onClick={() => start(() => newTeamTask(team.id))} className={btnPrimary}>New team task</button>}
      </div>

      {team.archived && (
        <div role="status" className="mt-6 flex flex-wrap items-center gap-3 rounded-[calc(var(--radius)*2)] border border-line bg-raised px-4 py-3">
          <p className="min-w-0 flex-1">This hive was archived on {team.archived}. It&apos;s read-only.</p>
          <Link href={`/hive/${team.id}/summary`} className="inline-flex min-h-10 items-center rounded-[var(--radius)] border border-line px-3 text-sm font-medium hover:border-accent-edge">Project summary</Link>
          {leader && <button type="button" onClick={() => setArchived(team.id, false)} className="min-h-10 rounded-[var(--radius)] border border-accent-edge/70 px-3 text-sm font-medium text-accent-text hover:bg-accent/10">Bring it back</button>}
        </div>
      )}
      {props.colonyInfo && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-[calc(var(--radius)*2)] border border-line bg-surface px-4 py-3 text-sm">
          <span className="text-muted">Swarm in <Link href={`/colony/${props.colonyInfo.id}`} className="font-medium text-ink underline underline-offset-4">{props.colonyInfo.name}</Link>.</span>
          {props.colonyInfo.milestones.length > 0 && <span className="text-muted">Milestones:</span>}
          {props.colonyInfo.milestones.map((m) => <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/70 px-2.5 py-0.5"><span aria-hidden className="size-2 rotate-45 rounded-[1px] bg-[#8B5CF6]" />{m.title}, {m.label}</span>)}
        </div>
      )}
      <div role="tablist" aria-label="Team sections" className="relative mt-8 -mx-1 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)}
            className="min-h-10 shrink-0 rounded-full px-4 font-medium whitespace-nowrap text-muted hover:text-ink aria-selected:bg-accent aria-selected:font-semibold aria-selected:text-on-accent aria-selected:shadow-[0_6px_18px_-8px_var(--accent)]">{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "plan" && <Plan team={team} me={me} members={members} milestones={props.hiveMilestones ?? []} checklists={props.checklists ?? []} />}
        {tab === "comb" && <><Countdown milestones={props.hiveMilestones ?? []} hourly={team.kind === "hackathon"} /></>}
        {tab === "comb" && <Comb team={team} members={members} tasks={tasks} stream={props.stream} me={me} />}
        {tab === "board" && <Board {...props} me={me} onRoster={() => setTab("members")} />}
        {tab === "calendar" && (props.calendar.length ? <HiveCalendar tasks={props.calendar} tz={props.tz} editable={has(me, "tasks")} embedded /> : <p className="rounded-[calc(var(--radius)*2)] border border-dashed border-line p-8 text-center text-muted">No team tasks have a due date yet. Give one a date and it shows up here.</p>)}
        {tab === "activity" && <Activity team={team} tasks={tasks} assigned={props.assigned} members={members} days={props.days} logs={props.logs} tz={props.tz} contributions={props.contributions} />}
        {tab === "vault" && <Vault team={team} links={props.links} members={members} me={me} />}
        {tab === "hierarchy" && <Hierarchy team={team} members={members} roles={props.roles} me={me} />}
        {tab === "members" && <Members team={team} members={members} roles={props.roles} me={me} />}
        {tab === "templates" && <Templates team={team} members={members} templates={props.templates} />}
        {tab === "log" && <EmailLog log={props.log} tz={props.tz} />}
        {tab === "settings" && <Settings team={team} me={me} roles={props.roles} members={members} />}
      </div>
    </>
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
          <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete the template “${t.title}”? Tasks made from it stay.`)) start(() => deleteTemplate(t.id)); }} className="mt-3 min-h-11 justify-self-start rounded-[var(--radius)] border border-line px-3 text-sm text-muted hover:border-danger hover:text-danger">Delete template</button>
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
          <label key={m.id} className="flex min-h-11 items-center gap-2"><input type="checkbox" name="member" value={m.id} defaultChecked={t.memberIds.includes(m.id)} className="size-4 accent-[var(--accent)]" />{nameOf(m)}</label>
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

const KIND = { assign: "New task", remind3: "Reminder", remind1: "Last reminder", digest: "Weekly digest", invite: "Invite", announce: "Class announcement", remind0: "Due today", help: "Asked for help", daily: "Daily digest", subtask: "Subtask reminder" } as const;

function EmailLog({ log, tz }: { log: LogRow[]; tz: string }) {
  if (log.length === 0) return <EmptyState pose="fly" title="No emails yet" body="Every Buzz email this team sends shows up here: who got it, what it was, when, and whether it went through." />;
  const when = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  return (
    <div className="relative overflow-x-auto rounded-[var(--radius)] border border-line">
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

function Settings({ team, me, roles, members }: { team: Team; me: MeT; roles: RoleT[]; members: Member[] }) {
  const router = useRouter();
  const [color, setColor] = useState(team.color);
  const [imp, setImp] = useState<Record<string, string>>(team.importanceColors ?? {});
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="grid max-w-2xl gap-10">
      {has(me, "settings") && <form className="grid gap-4" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          try {
            await updateTeam(team.id, { name: String(f.get("name")), color, digestEnabled: f.get("digest") === "on", digestDay: Number(f.get("digestDay")), importanceColors: imp });
            setMsg("Saved."); router.refresh();
          } catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't save."); }
        });
      }}>
        <label className="grid gap-2"><span className="font-medium">Team name</span><input name="name" defaultValue={team.name} maxLength={80} required className={field} /></label>
        <ColorPicker value={color} onChange={setColor} />
        <fieldset className="grid gap-2 rounded-[var(--radius)] border border-line p-4">
          <legend className="px-1 font-medium">Importance colours</legend>
          <p className="text-sm text-muted">Every task can be marked Low, Medium or High. Pick the colour each one shows in this team.</p>
          <div className="flex flex-wrap gap-4">
            {IMPORTANCE.map((l) => (
              <label key={l.v} className="flex min-h-11 items-center gap-2">
                <input type="color" value={imp[l.v] ?? l.color} onChange={(e) => setImp((x) => ({ ...x, [l.v]: e.target.value }))} className="size-11 cursor-pointer rounded-[var(--radius)] border border-line bg-bg p-1" />
                {l.label}
              </label>
            ))}
            <button type="button" onClick={() => setImp({})} className="min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm text-muted hover:border-accent-edge hover:text-ink">Reset to default</button>
          </div>
        </fieldset>
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
      </form>}

      {me.isAdmin && <Roles team={team} roles={roles} members={members} />}

      <BusyOverlay show={deleting} label="Deleting the team…" />
      <section aria-labelledby="arch-h" className="grid gap-3 rounded-[var(--radius)] border border-line p-5">
        <h2 id="arch-h" className="font-semibold">Finished? Archive and summarise</h2>
        <p className="text-sm text-muted">The project summary lists milestones hit, who contributed what, and the final results: ready to print or save as PDF for portfolios and resumes. Archiving makes the hive read-only and moves it to the Archived list; you can bring it back any time.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/hive/${team.id}/summary`} className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">Project summary</Link>
          {me.isAdmin && <button type="button" disabled={pending} onClick={() => start(async () => { await setArchived(team.id, !team.archived); router.refresh(); })} className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60">{team.archived ? "Bring the hive back" : "Archive this hive"}</button>}
        </div>
      </section>
      {me.isAdmin && <section aria-labelledby="danger-h" className="grid gap-3 rounded-[var(--radius)] border border-danger/50 p-5">
        <h2 id="danger-h" className="font-semibold text-danger">Delete this team</h2>
        <p className="text-sm text-muted">This deletes the team&apos;s tasks, roster and templates. It can&apos;t be undone. Type <strong className="text-ink">{team.name}</strong> to confirm.</p>
        <label className="sr-only" htmlFor="confirm-name">Team name</label>
        <input id="confirm-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className={field} autoComplete="off" />
        <button type="button" disabled={pending || confirmName.trim() !== team.name} onClick={() => { setDeleting(true); start(async () => { try { await deleteTeam(team.id, confirmName); } catch (e) { setDeleting(false); throw e; } }); }}
          className="min-h-11 justify-self-start rounded-[var(--radius)] border border-danger px-4 font-medium text-danger disabled:opacity-50">Delete team for good</button>
      </section>}
    </div>
  );
}
