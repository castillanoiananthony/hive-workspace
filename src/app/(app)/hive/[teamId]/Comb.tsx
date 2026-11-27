"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bee } from "@/components/brand/Bee";
import { HexBadge } from "@/components/app/HexBadge";
import { deleteCombPost, postToComb } from "../actions";
import { MemberAvatar } from "./MemberAvatar";
import { has, nameOf, type MeT, type MemberT, type StreamT, type TaskT, type TeamT } from "./types";

function ago(iso: string, now: number) {
  const m = Math.max(0, (now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${Math.floor(m)} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ago`;
  if (m < 10080) return `${Math.floor(m / 1440)} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The Comb: the team's own feed. Members post updates; finished and new tasks appear on their own. */
export function Comb({ team, members, tasks, stream, me }: { team: TeamT; members: MemberT[]; tasks: TaskT[]; stream: StreamT[]; me: MeT }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [now] = useState(() => Date.now());
  const member = (id: string | null) => members.find((m) => m.id === id);
  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title || "a task";
  const mine = member(me.memberId);

  return (
    <div className="mx-auto max-w-2xl">
      {has(me, "post") ? (
        <form className="flex gap-3 rounded-[var(--radius)] border border-line bg-surface p-4" onSubmit={(e) => {
          e.preventDefault();
          start(async () => { try { await postToComb(team.id, body); setBody(""); setErr(null); router.refresh(); } catch (x) { setErr(x instanceof Error ? x.message : "Couldn't post."); } });
        }}>
          {mine && <span className="hidden sm:block"><MemberAvatar m={mine} color={team.color} size={44} /></span>}
          <div className="grid min-w-0 flex-1 gap-2">
            <label htmlFor="comb-post" className="sr-only">Post an update to {team.name}</label>
            <textarea id="comb-post" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder={`Share an update with ${team.name}…`}
              className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-base focus:border-accent-edge" />
            <div className="flex items-center justify-between gap-3">
              <p role="status" className="text-sm text-danger">{err}</p>
              <button disabled={pending || !body.trim()} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">{pending ? "Posting…" : "Post"}</button>
            </div>
          </div>
        </form>
      ) : <p className="rounded-[var(--radius)] border border-line bg-surface p-4 text-sm text-muted">Posting is switched off for you in this team.</p>}

      {stream.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius)] border border-line bg-surface p-6 text-center">
          <div className="flex justify-center"><Bee pose="sleep" size={80} /></div>
          <p className="font-display mt-2 text-lg font-semibold">The Comb is quiet</p>
          <p className="mt-1 text-muted">Post the first update. New tasks and finished work show up here too.</p>
        </div>
      ) : (
        <ol className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3">
          {stream.map((s) => {
            const who = member(s.memberId);
            return (
              <li key={s.id}>
                <article className="rounded-[var(--radius)] border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    {s.kind === "task" ? <HexBadge label={team.name} color={team.color} size={40} /> : who ? <MemberAvatar m={who} color={team.color} size={40} /> : <HexBadge label="?" color={team.color} size={40} />}
                    <div className="min-w-0 flex-1">
                      {s.kind === "post" && <p className="truncate font-semibold">{who ? nameOf(who) : "Former member"}</p>}
                      {s.kind === "done" && <p><span className="font-semibold">{who ? nameOf(who) : "Someone"}</span> marked <Link href={`/tasks/${s.taskId}`} className="font-semibold hover:underline">“{taskTitle(s.taskId)}”</Link> done <span className="text-success">✓</span></p>}
                      {s.kind === "task" && <p>New task: <Link href={`/tasks/${s.taskId}`} className="font-semibold hover:underline">“{taskTitle(s.taskId)}”</Link></p>}
                      <p className="text-sm text-muted">{ago(s.at, now)}</p>
                    </div>
                    {s.kind === "post" && (s.memberId === me.memberId || me.isAdmin) && (
                      <button type="button" disabled={pending} onClick={() => { if (confirm("Delete this post?")) start(async () => { await deleteCombPost(s.id); router.refresh(); }); }} className="min-h-11 shrink-0 px-2 text-sm text-muted hover:text-danger">Delete</button>
                    )}
                  </div>
                  {/* the post gets the card's full width, not a column squeezed beside the picture */}
                  {s.kind === "post" && <p className="mt-3 max-w-[70ch] whitespace-pre-line break-words">{s.body}</p>}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
