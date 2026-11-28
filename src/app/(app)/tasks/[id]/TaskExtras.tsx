"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addComment, addSubtask, deleteComment, deleteSubtask, setSubtaskDone, updateSubtask } from "../../hive/work-actions";

export type SubtaskT = { id: string; title: string; ownerId: string | null; date: string | null; time: string | null; dueLabel: string | null; overdue: boolean; done: boolean };
export type CommentT = { id: string; memberId: string | null; name: string; body: string; at: string; atLabel: string };
type Member = { id: string; name: string; access: string };
type Me = { memberId: string; canEdit: boolean; canComment: boolean; isAdmin: boolean };
export type Extras = { taskId: string; members: Member[]; subtasks: SubtaskT[]; comments: CommentT[]; me: Me };

const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";

/** Subtasks (each with one owner and its own due date) and the comment thread, for a team task. */
export function TaskExtras({ taskId, members, subtasks, comments, me }: { taskId: string; members: Member[]; subtasks: SubtaskT[]; comments: CommentT[]; me: Me }) {
  return (
    <>
      <Subtasks taskId={taskId} members={members} subtasks={subtasks} me={me} />
      <Comments taskId={taskId} comments={comments} me={me} />
    </>
  );
}

function Subtasks({ taskId, members, subtasks, me }: { taskId: string; members: Member[]; subtasks: SubtaskT[]; me: Me }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const owners = members.filter((m) => m.access === "member");
  const [ticks, setTicks] = useState<Record<string, boolean>>({}); // instant feedback while the server saves
  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Nobody yet";
  const run = (fn: () => Promise<unknown>) => start(async () => { try { await fn(); setMsg(null); router.refresh(); } catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't save."); } });
  const done = subtasks.filter((s) => s.done).length;
  if (!subtasks.length && !me.canEdit) return null;
  return (
    <section aria-labelledby="sub-h" className="mt-8">
      <h2 id="sub-h" className="font-display text-lg font-semibold">Subtasks {subtasks.length > 0 && <span className="text-sm font-normal text-muted">{done} of {subtasks.length} done</span>}</h2>
      <p className="text-sm text-muted">Split the task into parts. Each part has one owner and its own due date.</p>
      <ul className="mt-3 grid gap-2">
        {subtasks.map((s) => {
          const mineOrEdit = s.ownerId === me.memberId || me.canEdit;
          return (
            <li key={s.id} className="grid gap-2 rounded-[var(--radius)] border border-line bg-surface p-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={ticks[s.id] ?? s.done} disabled={!mineOrEdit || pending} onChange={(e) => { const v = e.target.checked; setTicks((x) => ({ ...x, [s.id]: v })); run(() => setSubtaskDone(s.id, v).catch((err) => { setTicks((x) => ({ ...x, [s.id]: !v })); throw err; })); }}
                  aria-label={`${s.title} done`} className="mt-1 size-5 shrink-0 accent-[var(--accent)]" />
                <div className="min-w-0 flex-1">
                  {me.canEdit
                    ? <input aria-label="Subtask name" defaultValue={s.title} maxLength={200} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== s.title) run(() => updateSubtask(s.id, { title: e.target.value })); }} className={`w-full bg-transparent font-medium focus:outline-none ${s.done ? "text-muted line-through" : ""}`} />
                    : <p className={`font-medium ${s.done ? "text-muted line-through" : ""}`}>{s.title}</p>}
                  <p className="text-sm text-muted">{name(s.ownerId)}{s.dueLabel && <>, <span className={s.overdue && !s.done ? "text-danger" : undefined}>{s.overdue && !s.done ? "overdue, " : "due "}{s.dueLabel}</span></>}</p>
                </div>
                {me.canEdit && <button type="button" aria-label={`Delete ${s.title}`} title="Delete subtask" disabled={pending} onClick={() => { if (confirm(`Delete the subtask “${s.title}”?`)) run(() => deleteSubtask(s.id)); }} className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] border border-line text-muted hover:border-danger hover:text-danger">×</button>}
              </div>
              {me.canEdit && (
                <div className="flex flex-wrap gap-2 pl-8">
                  <label className="sr-only" htmlFor={`own-${s.id}`}>Owner of {s.title}</label>
                  <select id={`own-${s.id}`} value={s.ownerId ?? ""} disabled={pending} onChange={(e) => run(() => updateSubtask(s.id, { ownerId: e.target.value }))} className={`${field} min-h-10 text-sm`}>
                    <option value="">No owner</option>
                    {owners.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <label className="sr-only" htmlFor={`due-${s.id}`}>Due date of {s.title}</label>
                  <input id={`due-${s.id}`} type="date" defaultValue={s.date ?? ""} disabled={pending} onChange={(e) => run(() => updateSubtask(s.id, { date: e.target.value, time: s.time ?? "" }))} className={`${field} min-h-10 text-sm`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {me.canEdit && (
        <form className="mt-3 grid gap-2 rounded-[var(--radius)] border border-dashed border-line p-3 grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,11rem)_auto]" onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget, f = new FormData(form);
          run(async () => { await addSubtask(taskId, { title: String(f.get("title")), ownerId: String(f.get("owner")), date: String(f.get("date")) }); form.reset(); });
        }}>
          <label className="sr-only" htmlFor="new-sub">New subtask</label>
          <input id="new-sub" name="title" required maxLength={200} placeholder="New subtask, e.g. Record 5 launch angles" className={field} />
          <label className="sr-only" htmlFor="new-sub-owner">Owner</label>
          <select id="new-sub-owner" name="owner" className={field}><option value="">Owner…</option>{owners.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <label className="sr-only" htmlFor="new-sub-date">Due date</label>
          <input id="new-sub-date" name="date" type="date" className={field} />
          <button disabled={pending} className="min-h-11 rounded-[var(--radius)] border border-accent-edge/70 px-4 text-sm font-medium text-accent-text hover:bg-accent/10 disabled:opacity-60">Add subtask</button>
        </form>
      )}
      <p role="status" className="mt-1 text-sm text-danger">{msg}</p>
    </section>
  );
}

function Comments({ taskId, comments, me }: { taskId: string; comments: CommentT[]; me: Me }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section aria-labelledby="com-h" className="mt-8">
      <h2 id="com-h" className="font-display text-lg font-semibold">Comments {comments.length > 0 && <span className="text-sm font-normal text-muted">({comments.length})</span>}</h2>
      {comments.length === 0 ? <p className="mt-1 text-sm text-muted">No comments yet.</p> : (
        <ol className="mt-3 grid gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-[var(--radius)] border border-line bg-surface p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm"><span className="font-semibold">{c.name}</span> <span className="text-muted">{c.atLabel}</span></p>
                {(c.memberId === me.memberId || me.isAdmin) && <button type="button" disabled={pending} onClick={() => { if (confirm("Delete this comment?")) start(async () => { await deleteComment(c.id); router.refresh(); }); }} className="min-h-9 rounded-[var(--radius)] border border-line px-2 text-xs text-muted hover:border-danger hover:text-danger">Delete</button>}
              </div>
              <p className="mt-1 whitespace-pre-line break-words">{c.body}</p>
            </li>
          ))}
        </ol>
      )}
      {me.canComment ? (
        <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { try { await addComment(taskId, body); setBody(""); setMsg(null); router.refresh(); } catch (x) { setMsg(x instanceof Error ? x.message : "Couldn't post."); } }); }}>
          <label htmlFor="new-comment" className="sr-only">Write a comment</label>
          <textarea id="new-comment" value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={2000} placeholder="Ask a question or leave feedback…" className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-base focus:border-accent-edge" />
          <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-danger">{msg}</p><button disabled={pending || !body.trim()} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">Comment</button></div>
        </form>
      ) : <p className="mt-2 text-sm text-muted">Guests can read comments but not write them.</p>}
    </section>
  );
}
