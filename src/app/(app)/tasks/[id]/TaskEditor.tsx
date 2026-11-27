"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HexCheck } from "@/components/app/HexCheck";
import { deleteTask, saveTask, type TaskDoc } from "../../cell/actions";

type Save = "saved" | "saving" | "unsaved" | "error";
const STATUS: { id: TaskDoc["status"]; label: string }[] = [
  { id: "todo", label: "To do" }, { id: "doing", label: "In progress" }, { id: "done", label: "Done" },
];

export function TaskEditor({ id, initial, goals }: { id: string; initial: TaskDoc; goals: { id: string; title: string; level: string }[] }) {
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

  async function remove() {
    if (!confirm("Delete this task? You can undo right after.")) return;
    if (timer.current) clearTimeout(timer.current);
    const snapshot = await deleteTask(id);
    sessionStorage.setItem("hive-undo-task", JSON.stringify(snapshot));
    router.push("/cell");
  }

  const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
  const done = doc.checklist.filter((c) => c.done).length;

  return (
    <article>
      <div className="mb-6 flex items-center justify-between gap-4 text-sm">
        <Link href="/cell" className="min-h-11 py-2 text-muted hover:text-ink">← My Cell</Link>
        <p aria-live="polite" className={save === "error" ? "text-danger" : "text-muted"}>
          {save === "saved" ? "Saved" : save === "saving" ? "Saving…" : save === "error" ? "Couldn't save. Check your connection." : "Unsaved changes"}
        </p>
      </div>

      <label htmlFor="task-title" className="sr-only">Task title</label>
      <textarea
        id="task-title" rows={1} value={doc.title} placeholder="Untitled task" maxLength={200}
        onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
        className="font-display w-full resize-none bg-transparent text-3xl leading-tight font-semibold placeholder:text-muted focus:outline-none sm:text-4xl [field-sizing:content]"
      />

      <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-[var(--radius)] border border-line bg-surface p-4 sm:grid-cols-[8rem_1fr]">
        <dt className="self-center text-sm text-muted">Status</dt>
        <dd>
          <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-2">
            {STATUS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={doc.status === s.id} onClick={() => update({ status: s.id })}
                className="min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm font-medium aria-checked:border-accent-edge aria-checked:bg-raised">{s.label}</button>
            ))}
          </div>
        </dd>
        <dt className="self-center text-sm text-muted"><label htmlFor="due-date">Due date</label></dt>
        <dd className="flex flex-wrap items-center gap-2">
          <input id="due-date" type="date" value={doc.dueDate ?? ""} onChange={(e) => update({ dueDate: e.target.value || null, dueTime: e.target.value ? doc.dueTime : null })} className={field} />
          <label htmlFor="due-time" className="sr-only">Due time (optional)</label>
          <input id="due-time" type="time" value={doc.dueTime ?? ""} disabled={!doc.dueDate} onChange={(e) => update({ dueTime: e.target.value || null })} className={`${field} disabled:opacity-50`} />
          {doc.dueDate && <button type="button" onClick={() => update({ dueDate: null, dueTime: null })} className="min-h-11 px-2 text-sm text-muted hover:text-ink">Clear</button>}
        </dd>
        <dt className="self-center text-sm text-muted"><label htmlFor="goal">Goal</label></dt>
        <dd>
          <select id="goal" value={doc.goalId ?? ""} onChange={(e) => update({ goalId: e.target.value || null })} className={`${field} w-full`}>
            <option value="">No goal</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.title} ({g.level})</option>)}
          </select>
        </dd>
      </dl>

      <section aria-labelledby="notes-h" className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 id="notes-h" className="font-display text-lg font-semibold">Notes</h2>
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
        <button type="button" onClick={() => update({ links: [...doc.links, { title: "", url: "" }] })} className="mt-2 min-h-11 text-sm font-medium text-accent-text">Add a link</button>
        {note && <p role="status" className="mt-2 text-sm text-danger">{note}</p>}
      </section>

      <div className="mt-12 border-t border-line pt-6">
        <button type="button" onClick={remove} className="min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium text-danger hover:border-danger">Delete task</button>
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
    <button type="button" title={title} aria-label={title} aria-pressed={active} onMouseDown={(e) => e.preventDefault()} onClick={run}
      className="grid size-11 place-items-center rounded-[var(--radius)] text-sm font-semibold text-muted hover:text-ink aria-pressed:bg-raised aria-pressed:text-ink">{label}</button>
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
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap">
      {btn("H", "Heading", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {btn("B", "Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
      {btn("I", "Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
      {btn("•", "Bulleted list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
      {btn("1.", "Numbered list", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
      {btn("↗", "Link", editor.isActive("link"), link)}
    </div>
  );
}
