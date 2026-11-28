"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { Modal } from "@/components/app/Modal";
import { hexPoints } from "@/components/brand/Bee";
import type { Life } from "@/lib/life";
import { SUBJECT_COLORS, splitTerms, suggestSemesterName } from "@/lib/student";
import { setTaskStatus } from "./actions";
import { addClassSlot, addSubject, createSemester, deleteClassSlot, deleteSemester, deleteSubject, setTodaysThree, updateSubject } from "./life-actions";

export type Subject = { id: string; code: string; color: string };
export const SubjectsContext = createContext<Subject[]>([]);
const card = "rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5";
const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
const outline = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
const primary = "min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A subject as a small coloured chip; the colour is a dot, the code is plain text. */
export function SubjectChip({ id }: { id: string | null | undefined }) {
  const s = useContext(SubjectsContext).find((x) => x.id === id);
  if (!s) return null;
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs font-semibold whitespace-nowrap"><span aria-hidden className="size-2.5 rounded-full" style={{ background: s.color }} />{s.code}</span>;
}

export function SubjectFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const subjects = useContext(SubjectsContext);
  if (!subjects.length) return null;
  return (
    <div role="radiogroup" aria-label="Show tasks for" className="mt-6 flex flex-wrap gap-2">
      {[{ id: "", code: "All subjects", color: "" }, ...subjects].map((s) => (
        <button key={s.id || "all"} type="button" role="radio" aria-checked={value === s.id} onClick={() => onChange(s.id)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium hover:border-accent-edge aria-checked:border-accent-edge aria-checked:bg-raised">
          {s.color && <span aria-hidden className="size-2.5 rounded-full" style={{ background: s.color }} />}{s.code}
        </button>
      ))}
    </div>
  );
}

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>, ok?: string) => start(async () => { try { await fn(); setMsg(ok ?? null); router.refresh(); } catch (e) { setMsg(e instanceof Error ? e.message : "Something went wrong."); } });
  return { pending, msg, run };
}

// ---------------------------------------------------------------- the Today strip

/** Exam countdowns, the current term, Today's 3 and Nectar, at the top of My Cell. */
export function TodayPanel({ life, open }: { life: Life; open: { id: string; title: string }[] }) {
  return (
    <div className="mt-6 grid gap-4">
      {(life.exams.length > 0 || life.semester) && (
        <div className="flex flex-wrap gap-2" aria-label="Coming up">
          {life.semester && (
            <span className="inline-block rounded-[calc(var(--radius)*2)] border border-line bg-surface px-3 py-2 text-sm">
              <b>{life.semester.name}</b>{life.semester.upcoming ? " starts soon" : life.semester.term ? `: ${life.semester.term.name}, ${life.semester.term.daysLeft} ${life.semester.term.daysLeft === 1 ? "day" : "days"} left` : ""}
            </span>
          )}
          {life.exams.map((e) => (
            <Link key={e.id} href={`/tasks/${e.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-[#E5484D] bg-surface px-3 text-sm font-medium hover:bg-raised">
              <SubjectChip id={e.subjectId} /><span>{e.title}</span>
              <span className="font-semibold tabular-nums">{e.inDays <= 0 ? "today" : e.inDays === 1 ? "tomorrow" : `in ${e.inDays} days`}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <TodaysThree items={life.focus} open={open} />
        <Nectar n={life.nectar} />
      </div>
    </div>
  );
}

function TodaysThree({ items, open }: { items: Life["focus"]; open: { id: string; title: string }[] }) {
  const { pending, run } = useRun();
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const choices = open.filter((t) => !items.some((i) => i.id === t.id));
  return (
    <section aria-labelledby="t3-h" className={card}>
      <BusyOverlay show={pending} label="Saving…" />
      <h2 id="t3-h" className="font-display text-lg font-semibold">Today&apos;s 3</h2>
      <p className="text-sm text-muted">Pick up to three things to finish today. Tomorrow starts fresh.</p>
      <ol className="mt-3 grid gap-2">
        {items.map((t) => {
          const done = ticks[t.id] ?? t.done;
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-[var(--radius)] border border-line px-3 py-2">
              <input type="checkbox" checked={done} aria-label={`${t.title} done`} onChange={(e) => { const v = e.target.checked; setTicks((x) => ({ ...x, [t.id]: v })); run(() => setTaskStatus(t.id, v ? "done" : "todo")); }} className="size-5 shrink-0 accent-[var(--accent)]" />
              <Link href={`/tasks/${t.id}`} className={`min-w-0 flex-1 truncate hover:underline ${done ? "text-muted line-through" : ""}`}>{t.title}</Link>
              <SubjectChip id={t.subjectId} />
              <button type="button" aria-label={`Take ${t.title} off Today's 3`} onClick={() => run(() => setTodaysThree(items.filter((x) => x.id !== t.id).map((x) => x.id)))} className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-ink">×</button>
            </li>
          );
        })}
      </ol>
      {items.length < 3 && (choices.length > 0 ? (
        <div className="mt-3">
          <label className="sr-only" htmlFor="t3-add">Add a task to Today&apos;s 3</label>
          <select id="t3-add" value="" onChange={(e) => e.target.value && run(() => setTodaysThree([...items.map((x) => x.id), e.target.value]))} className={`${field} w-full`}>
            <option value="">+ Add a task for today…</option>
            {choices.map((t) => <option key={t.id} value={t.id}>{t.title || "Untitled task"}</option>)}
          </select>
        </div>
      ) : items.length === 0 && <p className="mt-2 text-sm text-muted">Add a task first, then pick it here.</p>)}
      {items.length > 0 && items.every((t) => ticks[t.id] ?? t.done) && <p className="mt-3 text-sm font-medium text-accent-text">All three done. Nice work.</p>}
    </section>
  );
}

/** Gentle streaks: a honeycomb cell for each of the last 7 days, filled when you finished at least one task that day. */
function Nectar({ n }: { n: Life["nectar"] }) {
  const label = (d: string) => new Intl.DateTimeFormat("en", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  return (
    <section aria-labelledby="nectar-h" className={card}>
      <h2 id="nectar-h" className="font-display text-lg font-semibold">Nectar</h2>
      <p className="text-sm text-muted">{n.streak > 0 ? `${n.streak}-day Nectar: you've finished something ${n.streak === 1 ? "today" : `${n.streak} days in a row`}.` : "Finish any task to start collecting Nectar."}{!n.today && n.streak > 0 ? " Today's still open." : ""}</p>
      <ol className="mt-3 flex justify-between gap-1" aria-label="The last 7 days">
        {n.week.map((d) => (
          <li key={d.date} className="grid justify-items-center gap-1 text-xs text-muted">
            <svg viewBox="0 0 40 40" width="34" height="34" role="img" aria-label={`${d.date}: ${d.filled ? "finished a task" : "nothing finished"}`}>
              <polygon points={hexPoints(20, 20, 17)} fill={d.filled ? "var(--accent)" : "var(--surface-raised)"} stroke={d.filled ? "var(--accent-edge)" : "var(--border)"} strokeWidth="2" />
            </svg>
            {label(d.date)}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- managers (subjects, schedule, semester)

export function LifeButtons({ life }: { life: Life }) {
  const [open, setOpen] = useState<"subjects" | "schedule" | "semester" | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen("subjects")} className={outline}>Subjects</button>
        <button type="button" onClick={() => setOpen("schedule")} className={outline}>Class schedule</button>
        <button type="button" onClick={() => setOpen("semester")} className={outline}>Semester</button>
      </div>
      <Modal open={open === "subjects"} onClose={() => setOpen(null)} title="Subjects"><Subjects subjects={life.subjects} /></Modal>
      <Modal open={open === "schedule"} onClose={() => setOpen(null)} title="Class schedule" wide><Schedule life={life} /></Modal>
      <Modal open={open === "semester"} onClose={() => setOpen(null)} title="Semester" wide><Semester life={life} /></Modal>
    </>
  );
}

function Subjects({ subjects }: { subjects: Subject[] }) {
  const { pending, msg, run } = useRun();
  const [code, setCode] = useState("");
  return (
    <div className="grid gap-4">
      <p className="text-muted">Tag tasks with a subject to filter them and see them in colour.</p>
      <ul className="grid gap-2">
        {subjects.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-line p-2">
            <span className="min-w-24 flex-1 pl-1 font-semibold">{s.code}</span>
            <span role="radiogroup" aria-label={`Colour for ${s.code}`} className="flex flex-wrap gap-1">
              {SUBJECT_COLORS.map((c, i) => <button key={c} type="button" role="radio" aria-checked={s.color === c} aria-label={`Colour ${i + 1}`} disabled={pending} onClick={() => run(() => updateSubject(s.id, { color: c }))} className="grid size-8 place-items-center rounded-full border-2 border-transparent aria-checked:border-ink"><span className="size-5 rounded-full" style={{ background: c }} /></button>)}
            </span>
            <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete ${s.code}? Its tasks stay, without a subject, and its class times are removed.`)) run(() => deleteSubject(s.id)); }} className={`${outline} min-h-9 px-3 text-sm hover:border-danger hover:text-danger`}>Delete</button>
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await addSubject(code); setCode(""); }); }}>
        <label className="sr-only" htmlFor="new-subj">Subject code</label>
        <input id="new-subj" value={code} onChange={(e) => setCode(e.target.value)} maxLength={24} placeholder="e.g. ASE 111" className={`${field} min-w-0 flex-1`} />
        <button disabled={pending || !code.trim()} className={primary}>Add</button>
      </form>
      <p role="status" className="text-sm text-danger">{msg}</p>
    </div>
  );
}

function Schedule({ life }: { life: Life }) {
  const { pending, msg, run } = useRun();
  const [days, setDays] = useState<number[]>([]);
  const name = (s: Life["slots"][number]) => s.title;
  return (
    <div className="grid gap-5">
      <p className="text-muted">Your weekly classes show on the calendar as repeating blocks{life.semester ? `, during ${life.semester.name}` : ""}.</p>
      {life.slots.length > 0 && (
        <ul className="grid gap-2">
          {life.slots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-line px-3 py-2">
              <span className="w-10 font-semibold">{DAYS[s.weekday]}</span>
              <span className="tabular-nums">{s.start}–{s.end}</span>
              <span className="min-w-0 flex-1 font-medium">{name(s)}{s.room && <span className="font-normal text-muted">, {s.room}</span>}</span>
              <button type="button" aria-label={`Remove ${name(s)} on ${DAYS[s.weekday]}`} disabled={pending} onClick={() => run(() => deleteClassSlot(s.id))} className={`${outline} min-h-9 px-3 text-sm hover:border-danger hover:text-danger`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="grid gap-3 rounded-[var(--radius)] border border-dashed border-line p-4" onSubmit={(e) => {
        e.preventDefault(); const f = new FormData(e.currentTarget), form = e.currentTarget;
        run(async () => { await addClassSlot({ subjectId: String(f.get("subject")) || undefined, title: String(f.get("title")), weekdays: days, start: String(f.get("start")), end: String(f.get("end")), room: String(f.get("room")) }); form.reset(); setDays([]); }, "Added to your schedule.");
      }}>
        <h3 className="font-semibold">Add a class</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1"><span className="text-sm font-medium">Subject</span>
            <select name="subject" className={field}><option value="">Not in my subjects</option>{life.subjects.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}</select>
          </label>
          <label className="grid gap-1"><span className="text-sm font-medium">Or class name</span><input name="title" maxLength={60} placeholder="PE 3" className={field} /></label>
        </div>
        <fieldset><legend className="mb-1 text-sm font-medium">Days</legend>
          <div className="flex flex-wrap gap-1">{DAYS.map((d, i) => <button key={d} type="button" aria-pressed={days.includes(i)} onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))} className="min-h-10 min-w-12 rounded-[var(--radius)] border border-line px-2 text-sm font-medium aria-pressed:border-accent-edge aria-pressed:bg-accent aria-pressed:text-on-accent">{d}</button>)}</div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1"><span className="text-sm font-medium">Starts</span><input name="start" type="time" required defaultValue="08:00" className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">Ends</span><input name="end" type="time" required defaultValue="09:30" className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">Room <span className="font-normal text-muted">(optional)</span></span><input name="room" maxLength={40} placeholder="EN 301" className={field} /></label>
        </div>
        <button disabled={pending || !days.length} className={`${primary} justify-self-start`}>Add to schedule</button>
      </form>
      <p role="status" className="text-sm text-muted">{msg}</p>
    </div>
  );
}

function Semester({ life }: { life: Life }) {
  const { pending, msg, run } = useRun();
  const [name, setName] = useState(suggestSemesterName(life.today));
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [terms, setTerms] = useState<{ name: string; start: string; end: string }[]>([]);
  const [goals, setGoals] = useState(true);
  const reterm = (s: string, e: string) => setTerms(s && e && e > s ? splitTerms(s, e) : []);
  return (
    <div className="grid gap-5">
      {life.semesters.length > 0 && (
        <ul className="grid gap-2">
          {life.semesters.map((s) => (
            <li key={s.id} className="rounded-[var(--radius)] border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{s.name}</span>
                <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove ${s.name}? Goals made from it stay.`)) run(() => deleteSemester(s.id)); }} className={`${outline} min-h-9 px-3 text-sm hover:border-danger hover:text-danger`}>Remove</button></div>
              <p className="text-sm text-muted">{s.periods.map((p) => `${p.name} ${p.start} to ${p.end}`).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await createSemester({ name, start, end, periods: terms, makeGoals: goals }); setStart(""); setEnd(""); setTerms([]); }, goals ? "Semester saved, with a goal for the sem and each term in My Cell." : "Semester saved."); }}>
        <h3 className="font-semibold">Add a semester</h3>
        <label className="grid gap-1"><span className="text-sm font-medium">Name</span><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className={field} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1"><span className="text-sm font-medium">First day of classes</span><input type="date" required value={start} onChange={(e) => { setStart(e.target.value); reterm(e.target.value, end); }} className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">Last day (end of finals)</span><input type="date" required value={end} onChange={(e) => { setEnd(e.target.value); reterm(start, e.target.value); }} className={field} /></label>
        </div>
        {terms.length > 0 && (
          <fieldset className="grid gap-2 rounded-[var(--radius)] border border-line p-3"><legend className="px-1 text-sm font-medium">Terms (adjust to your school&apos;s calendar)</legend>
            {terms.map((t, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                <input aria-label={`Term ${i + 1} name`} value={t.name} onChange={(e) => setTerms((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} className={field} />
                <input aria-label={`${t.name} starts`} type="date" value={t.start} onChange={(e) => setTerms((x) => x.map((y, j) => (j === i ? { ...y, start: e.target.value } : y)))} className={field} />
                <input aria-label={`${t.name} ends`} type="date" value={t.end} onChange={(e) => setTerms((x) => x.map((y, j) => (j === i ? { ...y, end: e.target.value } : y)))} className={field} />
              </div>
            ))}
          </fieldset>
        )}
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={goals} onChange={(e) => setGoals(e.target.checked)} className="size-5 accent-[var(--accent)]" /> Also make a goal for the sem with one for each term under it</label>
        <button disabled={pending || !terms.length} className={`${primary} justify-self-start`}>Save semester</button>
        <p role="status" className="text-sm text-muted">{msg}</p>
      </form>
    </div>
  );
}
