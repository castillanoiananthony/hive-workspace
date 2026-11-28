"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setWorking, workingHeartbeat } from "../team-extras-actions";
import { MemberAvatar } from "./MemberAvatar";
import { nameOf, type MeT, type MemberT, type TeamT } from "./types";

/** Who's working right now (for all-nighters). Refreshes about once a minute; lapses after 3 hours without activity. */
export function WorkingNow({ team, me, members }: { team: TeamT; me: MeT; members: MemberT[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const mine = members.find((m) => m.id === me.memberId);
  const [note, setNote] = useState(mine?.workingNote ?? "");
  const on = Boolean(mine?.working);
  const working = members.filter((m) => m.working);
  useEffect(() => {
    const tick = () => { if (document.visibilityState !== "visible") return; router.refresh(); };
    const t = setInterval(tick, 60_000), beat = setInterval(() => { if (on && document.visibilityState === "visible") workingHeartbeat(team.id).catch(() => {}); }, 5 * 60_000);
    return () => { clearInterval(t); clearInterval(beat); };
  }, [on, router, team.id]);
  if (team.archived) return null;
  const canWork = (me.access ?? "member") !== "guest";
  return (
    <div className="mt-5 grid gap-3 rounded-[calc(var(--radius)*2)] border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className={`size-2.5 rounded-full ${working.length ? "bg-success" : "bg-raised"}`} />
          {working.length ? `Working now (${working.length})` : "Nobody is working right now"}
        </span>
        {canWork && (
          <form className="flex min-w-0 flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { await setWorking(team.id, !on, note); router.refresh(); }); }}>
            {!on && <><label className="sr-only" htmlFor="work-note">What are you working on? (optional)</label><input id="work-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="What are you on? (optional)" className="min-h-10 w-52 max-w-full min-w-0 rounded-full border border-line bg-bg px-3 text-sm focus:border-accent-edge" /></>}
            <button disabled={pending} aria-pressed={on} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${on ? "border border-line hover:border-danger" : "bg-accent text-on-accent hover:bg-accent-hover"}`}>{on ? "Stop working" : "I'm working now"}</button>
          </form>
        )}
      </div>
      {working.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-2" aria-label="Working now">
          {working.map((m) => <li key={m.id} className="flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-success/50 py-0.5 pr-3 pl-0.5 text-sm"><MemberAvatar m={m} color={team.color} size={24} /><span className="shrink-0 font-medium">{nameOf(m)}</span>{m.workingNote && <span className="min-w-0 truncate text-muted">: {m.workingNote}</span>}</li>)}
        </ul>
      )}
    </div>
  );
}
