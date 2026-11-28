"use client";
import { IMPORTANCE, importanceOf } from "@/lib/importance";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HexCheck } from "@/components/app/HexCheck";
import { TaskExtras, type Extras } from "./TaskExtras";
import { deleteTask, saveTask, type TaskDoc } from "../../cell/actions";
import { saveAsTemplate, sendAssignmentEmails } from "../../hive/actions";

type Save = "saved" | "saving" | "unsaved" | "error";
const STATUS: { id: TaskDoc["status"]; label: string; team?: boolean }[] = [
  { id: "todo", label: "To do" }, { id: "doing", label: "In progress" }, { id: "review", label: "Needs review", team: true }, { id: "done", label: "Done" },
];

type TeamCtx = { id: string; name: string; color: string; importanceColors: Record<string, string> | null; canApprove: boolean; members: { id: string; name: string }[]; done: string[]; notified: string[] };

export function TaskEditor({ id, initial, goals, team, extras, subjects = [] }: { id: string; initial: TaskDoc; goals: { id: string; title: string; level: string }[]; team: TeamCtx | null; extras: Extras | null; subjects?: { id: string; code: string; color: string }[] }) {
  const router = useRouter();
  const [doc, setDoc] = useState<TaskDoc>(initial);
  const [save, setSave] = useState<Save>("saved");
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(doc);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] } }),
      Placeholder.configure({ placeholder: "Write anything: what this involves, notes from class, ideas…" }),
    ],
    content: (initial.notes as object) ?? "",
    immediatelyRender: false, // avoids a server/client mismatch in Next
    editorProps: { attributes: { class: "task-notes", "aria-label": "Notes", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => update({ notes: editor.getJSON() }),
  });
  // team tasks get a second document: the steps teammates read in their email
  const howTo = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] } }),
      Placeholder.configure({ placeholder: "Step by step, what should your teammates do? This goes in their email." }),
    ],
    content: (initial.howTo as object) ?? "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "task-notes", "aria-label": "How to do it", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => update({ howTo: editor.getJSON() }),
  });
  const [templated, setTemplated] = useState(false);
  // Buzz: assignees are emailed a minute after the last edit (so a half-typed task isn't sent), or straight away with "Send now"
  const [notified, setNotified] = useState<string[]>(team?.notified ?? []);
  const [mailState, setMailState] = useState<string | null>(null);
  const mailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsent = team ? (doc.assignees ?? []).filter((m) => !notified.includes(m)) : [];
  async function sendNow() {
    if (mailTimer.current) clearTimeout(mailTimer.current);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; await flush(); }
    setMailState("Sending…");
    try {
      const n = await sendAssignmentEmails(id);
      setNotified((x) => [...new Set([...x, ...(latest.current.assignees ?? [])])]);
      setMailState(n ? `Emailed ${n} ${n === 1 ? "person" : "people"}.` : "Everyone assigned has already been emailed.");
      router.refresh();
    } catch (err) {
      setMailState(err instanceof Error ? err.message : "Couldn't send the emails.");
    }
  }
  useEffect(() => {
    if (!team || unsent.length === 0 || !doc.title.trim()) return;
    if (mailTimer.current) clearTimeout(mailTimer.current);
    mailTimer.current = setTimeout(sendNow, 60000);
    return () => { if (mailTimer.current) clearTimeout(mailTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart the countdown whenever the task changes
  }, [doc]);
  // leaving the page early still sends: the save finishes first, then the email goes out
  const pendingMail = useRef(false);
  useEffect(() => { pendingMail.current = Boolean(team && unsent.length && doc.title.trim()); });
  useEffect(() => () => {
    if (!pendingMail.current) return;
    (timer.current ? saveTask(id, latest.current) : Promise.resolve()).then(() => sendAssignmentEmails(id)).catch(() => {}); // hourly sweep is the backstop
  }, [id]);

  // autosave: wait for a pause in typing, then send the whole document
  function update(patch: Partial<TaskDoc>) {
    latest.current = { ...latest.current, ...patch };
    setDoc(latest.current);
    setSave("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }
  async function flush() {
    setSave("saving");
    try {
      const r = await saveTask(id, latest.current);
      setSave("saved");
      setNote(r.droppedLinks > 0 ? "A link was skipped: links must start with http:// or https://." : null);
    } catch {
      setSave("error");
    }
  }
  // save before leaving the page if a change is still waiting
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (timer.current && save !== "saved") e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  // "Done": changes already save themselves; this saves anything still waiting and takes you back
  const [finishing, setFinishing] = useState(false);
  async function finish() {
    setFinishing(true);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; await flush(); }
    if (Number(sessionStorage.getItem("hive-pages") ?? 0) > 1) router.back();
    else router.push(team ? `/hive/${team.id}` : "/cell");
  }

  async function remove() {
    if (!confirm("Delete this task? You can undo right after.")) return;
    if (timer.current) clearTimeout(timer.current);
    const snapshot = await deleteTask(id);
    sessionStorage.setItem("hive-undo-task", JSON.stringify(snapshot));
    router.push(team ? `/hive/${team.id}` : "/cell");
  }

  const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
  const done = doc.checklist.filter((c) => c.done).length;

  return (
    <article>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <BackButton fallback={team ? `/hive/${team.id}` : "/cell"} label={team ? `Back to ${team.name}` : "Back"} />
        <div className="flex items-center gap-3">
          <p aria-live="polite" className={save === "error" ? "text-danger" : "text-muted"}>
            {save === "saved" ? "Saved" : save === "saving" ? "Saving…" : save === "error" ? "Couldn't save. Check your connection." : "Unsaved changes"}
          </p>
          <button type="button" onClick={finish} disabled={finishing} title="Save and go back"
            className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">
            {finishing ? "Saving…" : "Done"}
          </button>
        </div>
      </div>

      <h1 className="sr-only">{doc.title || "Untitled task"}</h1>
      <label htmlFor="task-title" className="sr-only">Task title</label>
      <textarea
        id="task-title" rows={1} value={doc.title} placeholder="Untitled task" maxLength={200}
        onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
        className="font-display w-full resize-none bg-transparent text-3xl leading-tight font-semibold placeholder:text-muted focus:outline-none sm:text-4xl [field-sizing:content]"
      />

      {/* details first on phones; on wide screens they sit in a right-hand column beside the document */}
      <div className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <dl className="grid gap-x-6 gap-y-4 self-start rounded-[var(--radius)] border border-line bg-surface p-4 sm:grid-cols-[8rem_1fr] lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:grid-cols-1 lg:gap-y-2">
        <dt className="self-center text-sm text-muted">Status</dt>
        <dd>
          <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-2">
            {STATUS.filter((s) => !s.team || team).map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={doc.status === s.id} onClick={() => update({ status: s.id })}
                disabled={Boolean(team && !team.canApprove && (s.id === "done") !== (doc.status === "done"))} title={team && !team.canApprove && s.id === "done" ? "Only the Leader, or someone who can approve work, can mark this Done" : undefined}
                className="min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm font-medium aria-checked:border-accent-edge aria-checked:bg-raised disabled:opacity-40">{s.label}</button>
            ))}
          </div>
        </dd>
        <dt className="self-center text-sm text-muted">Importance</dt>
        <dd>
          <div role="radiogroup" aria-label="Importance" className="flex flex-wrap gap-2">
            {[{ v: 0, label: "None", color: null as string | null }, ...IMPORTANCE.map((l) => ({ v: l.v as number, label: l.label, color: importanceOf(l.v, team?.importanceColors)!.color }))].map((l) => (
              <button key={l.v} type="button" role="radio" aria-checked={(doc.importance ?? 0) === l.v} onClick={() => update({ importance: l.v })}
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-line px-3 text-sm font-medium aria-checked:bg-raised"
                style={(doc.importance ?? 0) === l.v && l.color ? { borderColor: l.color } : undefined}>
                {l.color && <span aria-hidden className="size-3 rounded-full" style={{ background: l.color }} />}{l.label}
              </button>
            ))}
          </div>
        </dd>
        {!team && (
          <>
            <dt className="self-center text-sm text-muted"><label htmlFor="task-subject">Subject</label></dt>
            <dd className="flex flex-wrap items-center gap-3">
              <select id="task-subject" value={doc.subjectId ?? ""} onChange={(e) => update({ subjectId: e.target.value || null })} className={field}>
                <option value="">No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
              </select>
              {subjects.length === 0 && <Link href="/cell" className="text-sm text-accent-text underline underline-offset-4">Add subjects in My Cell</Link>}
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(doc.isExam)} onChange={(e) => update({ isExam: e.target.checked })} className="size-5 accent-[var(--accent)]" /> This is an exam (count it down)</label>
            </dd>
          </>
        )}
        <dt className="self-center text-sm text-muted"><label htmlFor="due-date">Due date</label></dt>
        <dd className="flex flex-wrap items-center gap-2">
          <input id="due-date" type="date" value={doc.dueDate ?? ""} onChange={(e) => update({ dueDate: e.target.value || null, dueTime: e.target.value ? doc.dueTime : null })} className={field} />
          <label htmlFor="due-time" className="sr-only">Due time (optional)</label>
          <input id="due-time" type="time" value={doc.dueTime ?? ""} disabled={!doc.dueDate} onChange={(e) => update({ dueTime: e.target.value || null })} className={`${field} disabled:opacity-50`} />
          {doc.dueDate && <button type="button" onClick={() => update({ dueDate: null, dueTime: null })} className="min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm text-muted hover:border-accent-edge hover:text-ink">Clear</button>}
        </dd>
        {team ? (
          <>
            <dt className="text-sm text-muted">Assigned to</dt>
            <dd>
              {team.members.length === 0 ? (
                <p className="text-sm text-muted">No members yet. <Link href={`/hive/${team.id}`} className="text-accent-text underline underline-offset-4">Add them on the team page</Link>.</p>
              ) : (
                <fieldset className="grid gap-1">
                  <legend className="sr-only">Assigned to</legend>
                  <button type="button" onClick={() => update({ assignees: doc.assignees?.length === team.members.length ? [] : team.members.map((m) => m.id) })} className="min-h-11 justify-self-start rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm font-medium text-accent-text">
                    {doc.assignees?.length === team.members.length ? "Clear everyone" : "Assign whole team"}
                  </button>
                  {team.members.map((m) => (
                    <label key={m.id} className="flex min-h-11 items-center gap-2">
                      <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={doc.assignees?.includes(m.id) ?? false}
                        onChange={(e) => update({ assignees: e.target.checked ? [...(doc.assignees ?? []), m.id] : (doc.assignees ?? []).filter((x) => x !== m.id) })} />
                      <span className="flex-1">{m.name}</span>
                      {team.done.includes(m.id) ? <span className="text-sm text-success">✓ Done</span>
                        : doc.assignees?.includes(m.id) && (notified.includes(m.id) ? <span className="text-sm text-muted">Emailed</span> : <span className="text-sm text-accent-text">Not emailed yet</span>)}
                    </label>
                  ))}
                  {unsent.length > 0 && (
                    <div className="mt-2 grid gap-2 rounded-[var(--radius)] bg-raised p-3 text-sm">
                      <p>{doc.title.trim() ? `Hexley emails ${unsent.length === 1 ? "this person" : `these ${unsent.length} people`} a minute after your last change.` : "Add a title, then Hexley can email them."}</p>
                      <button type="button" disabled={!doc.title.trim()} onClick={sendNow} className="min-h-11 justify-self-start rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50">Send now</button>
                    </div>
                  )}
                  {mailState && <p role="status" className="text-sm text-muted">{mailState}</p>}
                </fieldset>
              )}
            </dd>
          </>
        ) : (
          <>
            <dt className="self-center text-sm text-muted"><label htmlFor="goal">Goal</label></dt>
            <dd>
              <select id="goal" value={doc.goalId ?? ""} onChange={(e) => update({ goalId: e.target.value || null })} className={`${field} w-full`}>
                <option value="">No goal</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title} ({g.level})</option>)}
              </select>
            </dd>
          </>
        )}
      </dl>
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">

      {team && howTo && (
        <section aria-labelledby="howto-h" className="mb-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="howto-h" className="font-display text-lg font-semibold">How to do it</h2>
            <Toolbar editor={howTo} />
          </div>
          <p className="text-sm text-muted">Assigned teammates see this, the links and the due date in their email.</p>
          <EditorContent editor={howTo} className="mt-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 focus-within:border-accent-edge" />
        </section>
      )}

      <section aria-labelledby="notes-h">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="notes-h" className="font-display text-lg font-semibold">{team ? "Private notes" : "Notes"}</h2>
          {editor && <Toolbar editor={editor} />}
        </div>
        <EditorContent editor={editor} className="mt-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 focus-within:border-accent-edge" />
      </section>

      <section aria-labelledby="check-h" className="mt-8">
        <h2 id="check-h" className="font-display text-lg font-semibold">Checklist {doc.checklist.length > 0 && <span className="text-sm font-normal text-muted">{done} of {doc.checklist.length} done</span>}</h2>
        <ul className="mt-2 grid gap-1">
          {doc.checklist.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              <HexCheck checked={c.done} label={`Done: ${c.text || "item"}`} onChange={(v) => update({ checklist: doc.checklist.map((x, j) => (j === i ? { ...x, done: v } : x)) })} />
              <input aria-label={`Checklist item ${i + 1}`} value={c.text} onChange={(e) => update({ checklist: doc.checklist.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                className={`min-h-11 flex-1 bg-transparent px-1 focus:outline-none ${c.done ? "text-muted line-through" : ""}`} />
              <button type="button" aria-label={`Remove checklist item ${i + 1}`} title="Remove" onClick={() => update({ checklist: doc.checklist.filter((_, j) => j !== i) })} className="size-11 text-muted hover:text-danger">×</button>
            </li>
          ))}
        </ul>
        <AddRow placeholder="Add an item" label="Add checklist item" onAdd={(text) => update({ checklist: [...doc.checklist, { text, done: false }] })} />
      </section>

      <section aria-labelledby="links-h" className="mt-8">
        <h2 id="links-h" className="font-display text-lg font-semibold">Links</h2>
        <ul className="mt-2 grid gap-2">
          {doc.links.map((l, i) => (
            <li key={i} className="grid gap-2 rounded-[var(--radius)] border border-line p-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <input aria-label={`Link ${i + 1} name`} placeholder="Name" value={l.title} onChange={(e) => update({ links: doc.links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={field} />
              <input aria-label={`Link ${i + 1} address`} type="url" placeholder="https://" value={l.url} onChange={(e) => update({ links: doc.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} className={field} />
              <div className="flex">
                {/^https?:\/\//.test(l.url) && <a href={l.url} target="_blank" rel="noreferrer noopener" className="grid min-h-11 place-items-center px-3 text-sm text-accent-text">Open</a>}
                <button type="button" aria-label={`Remove link ${i + 1}`} title="Remove" onClick={() => update({ links: doc.links.filter((_, j) => j !== i) })} className="size-11 text-muted hover:text-danger">×</button>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => update({ links: [...doc.links, { title: "", url: "" }] })} className="mt-2 min-h-11 rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm font-medium text-accent-text">Add a link</button>
        {note && <p role="status" className="mt-2 text-sm text-danger">{note}</p>}
      </section>

      {extras && <TaskExtras {...extras} />}

      <div className="mt-12 border-t border-line pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={finish} disabled={finishing} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">{finishing ? "Saving…" : "Done"}</button>
          {team && (
            <button type="button" disabled={templated} onClick={async () => { if (timer.current) { clearTimeout(timer.current); await flush(); } await saveAsTemplate(id); setTemplated(true); }}
              className="min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge disabled:opacity-60">
              {templated ? "Saved as a template" : "Save as template"}
            </button>
          )}
          <button type="button" onClick={remove} className="min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium text-danger hover:border-danger">Delete task</button>
        </div>
      </div>
      </div>
      </div>
    </article>
  );
}

function AddRow({ placeholder, label, onAdd }: { placeholder: string; label: string; onAdd: (text: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }} className="mt-1 flex items-center gap-1">
      <span aria-hidden className="grid size-11 place-items-center text-muted">+</span>
      <input aria-label={label} placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} className="min-h-11 flex-1 bg-transparent px-1 placeholder:text-muted focus:outline-none" />
    </form>
  );
}

function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const btn = (label: string, title: string, active: boolean, run: () => void) => (
    <button type="button" title={title} aria-pressed={active} onMouseDown={(e) => e.preventDefault()} onClick={run}
      className="grid size-11 place-items-center rounded-[var(--radius)] text-sm font-semibold text-muted hover:text-ink aria-pressed:bg-raised aria-pressed:text-ink">
      {/* the symbol is for eyes; screen readers hear the word */}
      <span aria-hidden>{label}</span><span className="sr-only">{title}</span>
    </button>
  );
  function link() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = prompt("Link address (https://…)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) return editor.chain().focus().unsetLink().run();
    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) return alert("Links must start with https://, http:// or mailto:");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }
  return (
    <div role="toolbar" aria-label="Formatting" className="-ml-3 flex flex-nowrap sm:ml-0">
      {btn("H", "Heading", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {btn("B", "Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
      {btn("I", "Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
      {btn("•", "Bulleted list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
      {btn("1.", "Numbered list", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
      {btn("↗", "Link", editor.isActive("link"), link)}
    </div>
  );
}
