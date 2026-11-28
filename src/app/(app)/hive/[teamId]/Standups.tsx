"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { previewStandup, saveStandup } from "../team-extras-actions";
import { has, nameOf, type MeT, type MemberT, type NoteT, type TaskT, type TeamT } from "./types";

type Preview = Awaited<ReturnType<typeof previewStandup>>;
const card = "rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5";

/** Standup and meeting notes. Lines like "@Ian fix login bug by Friday" become tasks (after a preview) with the normal Buzz email. */
export function Standups({ team, me, members, notes, tasks, tz }: { team: TeamT; me: MeT; members: MemberT[]; notes: NoteT[]; tasks: TaskT[]; tz: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canTasks = has(me, "tasks") && !team.archived, canWrite = (me.access ?? "member") === "member" && !team.archived;
  const ready = preview?.filter((p) => p.memberId) ?? [];
  const who = (id: string | null) => { const m = members.find((x) => x.id === id); return m ? nameOf(m) : "Former member"; };
  const title = (id: string) => tasks.find((t) => t.id === id)?.title || "a task";
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso)) : null);
  const save = (createTasks: boolean) => start(async () => {
    try { const r = await saveStandup(team.id, body, createTasks); setBody(""); setPreview(null); setMsg(r.tasks ? `Saved. ${r.tasks} ${r.tasks === 1 ? "task was" : "tasks were"} created and Buzz emailed the people assigned.` : "Note saved."); router.refresh(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't save."); }
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BusyOverlay show={pending} label="Saving the notes…" />
      {canWrite ? (
        <section aria-labelledby="sn-h" className={`${card} grid content-start gap-3`}>
          <h2 id="sn-h" className="font-display text-lg font-semibold">New standup or meeting note</h2>
          <p className="text-sm text-muted">Write as usual. Any line with <b>@name</b> becomes a task for that person, and a date in it becomes the due date, e.g. <code className="rounded bg-raised px-1">@Ian fix login bug by Friday</code>.</p>
          <label htmlFor="standup" className="sr-only">Notes</label>
          <textarea id="standup" value={body} onChange={(e) => { setBody(e.target.value); setPreview(null); }} rows={9} maxLength={8000}
            placeholder={"Standup, Sat 9 AM\n- Login works on Android now\n- @Ian fix login bug on iOS by Friday\n- @Ana record the demo video tomorrow 5pm"} className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 font-mono text-sm focus:border-accent-edge" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || !body.trim()} onClick={() => start(async () => { try { setPreview(await previewStandup(team.id, body)); setMsg(null); } catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't read it."); } })} className="min-h-11 rounded-[var(--radius)] border border-accent-edge/70 px-4 font-medium text-accent-text hover:bg-accent/10 disabled:opacity-60">Preview tasks</button>
            <button type="button" disabled={pending || !body.trim()} onClick={() => save(false)} className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60">Save note only</button>
          </div>
          {preview && (
            <div className="grid gap-2 rounded-[var(--radius)] border border-line p-3">
              {preview.length === 0 ? <p className="text-sm text-muted">No @name lines found, so no tasks will be made.</p> : (
                <ul className="grid gap-2">
                  {preview.map((p, i) => (
                    <li key={i} className={`rounded-[var(--radius)] border px-3 py-2 text-sm ${p.memberId ? "border-line" : "border-danger/60"}`}>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-muted">{p.memberId ? `For ${p.who}` : `Nobody called “@${p.mention}” in this hive, so this line will be skipped`}{p.dueAt ? `, due ${date(p.dueAt)}` : ", no due date"}</p>
                    </li>
                  ))}
                </ul>
              )}
              {ready.length > 0 && (canTasks
                ? <button type="button" disabled={pending} onClick={() => save(true)} className="min-h-11 justify-self-start rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">Save and create {ready.length} {ready.length === 1 ? "task" : "tasks"}</button>
                : <p className="text-sm text-muted">Only people who can create tasks can turn notes into tasks. Save the note and ask your leader.</p>)}
            </div>
          )}
          <p role="status" className="text-sm text-muted">{msg}</p>
        </section>
      ) : <p className={`${card} text-sm text-muted`}>You can read the team&apos;s notes here.</p>}
      <section aria-labelledby="past-h" className={card}>
        <h2 id="past-h" className="font-display text-lg font-semibold">Past notes</h2>
        {notes.length === 0 ? <p className="mt-2 text-sm text-muted">No notes yet.</p> : (
          <ol className="mt-3 grid gap-4">
            {notes.map((n) => (
              <li key={n.id} className="border-b border-line pb-4 last:border-0">
                <p className="text-sm text-muted">{n.label}, {who(n.memberId)}</p>
                <pre className="mt-1 font-sans text-sm whitespace-pre-wrap break-words">{n.body}</pre>
                {n.taskIds.length > 0 && <p className="mt-2 flex flex-wrap gap-2 text-sm">{n.taskIds.map((id) => <Link key={id} href={`/tasks/${id}`} className="rounded-full border border-line px-2 py-0.5 hover:border-accent-edge">{title(id)}</Link>)}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
