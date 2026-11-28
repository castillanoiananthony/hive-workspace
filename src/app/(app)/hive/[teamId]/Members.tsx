"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { setMemberAccess } from "../work-actions";
import { addMembers, removeMember, renameMember, setJoinLink } from "../actions";
import { MemberAvatar } from "./MemberAvatar";
import { has, nameOf, type MeT, type MemberT, type RoleT, type TeamT } from "./types";

const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
const btn = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
const btnPrimary = "min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";

export function Members({ team, members, roles, me }: { team: TeamT; members: MemberT[]; roles: RoleT[]; me: MeT }) {
  const canManage = has(me, "members");
  const joined = members.filter((m) => m.joined), invited = members.filter((m) => !m.joined);
  const roleName = (m: MemberT) => (m.isAdmin ? "Admin" : m.access === "adviser" ? "Adviser" : m.access === "guest" ? "Guest" : roles.find((r) => r.id === m.roleId)?.name ?? "Member");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8">
        <section aria-labelledby="joined-h">
          <h2 id="joined-h" className="font-display text-xl font-semibold">Members ({joined.length})</h2>
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
            {joined.map((m) => <MemberRow key={m.id} m={m} team={team} role={roleName(m)} canManage={canManage} me={me} />)}
          </ul>
        </section>
        {invited.length > 0 && (
          <section aria-labelledby="invited-h">
            <h2 id="invited-h" className="font-display text-xl font-semibold">Invited, not signed up yet ({invited.length})</h2>
            <p className="mt-1 text-sm text-muted">They still get task emails. They become members as soon as they sign up with that email address.</p>
            <ul className="mt-3 divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
              {invited.map((m) => <MemberRow key={m.id} m={m} team={team} role={roleName(m)} canManage={canManage} me={me} />)}
            </ul>
          </section>
        )}
      </div>
      {canManage ? (
        <div className="grid min-w-0 content-start gap-6">
          <Invite team={team} />
          <JoinLink team={team} />
        </div>
      ) : (
        <p className="self-start rounded-[var(--radius)] border border-line bg-surface p-5 text-sm text-muted">Ask the team&apos;s admin if you&apos;d like to invite someone.</p>
      )}
    </div>
  );
}

function MemberRow({ m, team, role, canManage, me }: { m: MemberT; team: TeamT; role: string; canManage: boolean; me: MeT }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const remove = () => { if (confirm(`Remove ${nameOf(m)} from the team? Their task assignments are removed too.`)) start(async () => { await removeMember(m.id); router.refresh(); }); };
  const ghost = "min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm text-muted hover:border-accent-edge hover:text-ink";
  const danger = "min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm text-muted hover:border-danger hover:text-danger";
  return (
    <li className="flex items-start gap-3 p-4">
      <MemberAvatar m={m} color={team.color} size={40} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("n")); start(async () => { await renameMember(m.id, n); setEditing(false); router.refresh(); }); }} className="flex gap-2">
            <label className="sr-only" htmlFor={`n-${m.id}`}>Name</label>
            <input id={`n-${m.id}`} name="n" defaultValue={m.name} autoFocus maxLength={80} className={`${field} min-w-0 flex-1`} />
            <button disabled={pending} className={btn}>Save</button>
          </form>
        ) : (
          <>
            <p className="font-medium [overflow-wrap:anywhere]">
              {m.userId ? <Link href={m.id === me.memberId ? "/profile" : `/u/${m.userId}`} className="hover:underline">{nameOf(m)}</Link> : nameOf(m)}
              {m.nickname && <span className="font-normal text-muted"> ({m.name})</span>}{m.id === me.memberId && <span className="font-normal text-muted"> (you)</span>}
            </p>
            <p className="truncate text-sm text-muted">{role}{m.email ? `, ${m.email}` : ""}{m.unsubscribed ? ". Turned off Buzz emails" : ""}</p>
            {me.isAdmin && !m.isAdmin && (
              <label className="mt-2 flex max-w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span className="text-muted">Access</span>
                <select value={m.access ?? "member"} disabled={pending} onChange={(e) => { const v = e.target.value as "member" | "adviser" | "guest"; start(async () => { await setMemberAccess(m.id, v); router.refresh(); }); }}
                  className="min-h-10 w-full max-w-72 min-w-0 rounded-[var(--radius)] border border-line bg-bg px-3 text-sm sm:w-auto">
                  <option value="member">Member</option>
                  <option value="adviser">Adviser (sees all, comments)</option>
                  <option value="guest">Guest (tasks and The Comb)</option>
                </select>
              </label>
            )}
          </>
        )}
      </div>
      {canManage && !editing && (
        <>
          {/* wide screens: the buttons; phones: one ⋯ menu so the name keeps its room */}
          <div className="hidden gap-2 sm:flex">
            <button type="button" onClick={() => setEditing(true)} className={ghost}>Rename</button>
            {!m.isAdmin && <button type="button" disabled={pending} onClick={remove} className={danger}>Remove</button>}
          </div>
          <details className="relative sm:hidden">
            <summary aria-label={`Options for ${nameOf(m)}`} className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-line text-muted hover:border-accent-edge hover:text-ink [&::-webkit-details-marker]:hidden">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </summary>
            <div className="absolute right-0 z-20 mt-2 grid w-44 gap-1 rounded-[var(--radius)] border border-line bg-raised p-1 shadow-2xl">
              {m.userId && <Link href={`/u/${m.userId}`} className="flex min-h-11 items-center rounded-[calc(var(--radius)-4px)] px-3 hover:bg-surface">View profile</Link>}
              <button type="button" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); setEditing(true); }} className="flex min-h-11 items-center rounded-[calc(var(--radius)-4px)] px-3 text-left hover:bg-surface">Rename</button>
              {!m.isAdmin && <button type="button" disabled={pending} onClick={remove} className="flex min-h-11 items-center rounded-[calc(var(--radius)-4px)] px-3 text-left text-danger hover:bg-surface">Remove from team</button>}
            </div>
          </details>
        </>
      )}
    </li>
  );
}

function Invite({ team }: { team: TeamT }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-3 rounded-[var(--radius)] border border-line bg-surface p-5" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        try {
          const r = await addMembers(team.id, input);
          setReport([
            r.added.length ? `Invited ${r.added.length} ${r.added.length === 1 ? "person" : "people"}. They'll get an email.` : "Nobody new to invite.",
            r.duplicates.length ? `Skipped ${r.duplicates.length} already in the team.` : "",
            r.invalid.length ? `These don't look like email addresses: ${r.invalid.join(", ")}.` : "",
            r.overLimit ? `${r.overLimit} left out: a team can have up to 200 members.` : "",
          ].filter(Boolean).join(" "));
          setInput(r.invalid.join("\n"));
          router.refresh();
        } catch (err) { setReport(err instanceof Error ? err.message : "Couldn't invite them."); }
      });
    }}>
      <BusyOverlay show={pending} label="Sending invites…" />
      <h2 className="font-display text-lg font-semibold">Invite by email</h2>
      <label htmlFor="emails" className="text-sm text-muted">One email or many, separated by commas or new lines. “Ana Cruz &lt;ana@school.edu&gt;” keeps the name. People who already have an account join straight away.</label>
      <textarea id="emails" value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder={"ana@school.edu, ben@school.edu\nCarla Reyes <carla@school.edu>"} className={`${field} py-2`} />
      <button disabled={pending || !input.trim()} className={btnPrimary}>{pending ? "Inviting…" : "Send invites"}</button>
      <p role="status" className="text-sm text-muted">{report}</p>
    </form>
  );
}

function JoinLink({ team }: { team: TeamT }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const url = team.joinCode ? `${team.app}/join/${team.joinCode}` : null;
  const act = (mode: "on" | "off" | "new") => start(async () => { await setJoinLink(team.id, mode); router.refresh(); });
  return (
    <section aria-labelledby="join-h" className="grid gap-3 rounded-[var(--radius)] border border-line bg-surface p-5">
      <h2 id="join-h" className="font-display text-lg font-semibold">Join link</h2>
      <p className="text-sm text-muted">Anyone with this link can sign up and join {team.name}. Good for a class group chat; switch it off when everyone&apos;s in.</p>
      {url ? (
        <>
          <label className="sr-only" htmlFor="join-url">Join link</label>
          <input id="join-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-sm`} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }} className={btnPrimary}>{copied ? "Copied" : "Copy link"}</button>
            <button type="button" disabled={pending} onClick={() => act("new")} className={btn}>New link</button>
            <button type="button" disabled={pending} onClick={() => act("off")} className={btn}>Switch off</button>
          </div>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => act("on")} className={btnPrimary}>Turn on the join link</button>
      )}
    </section>
  );
}
