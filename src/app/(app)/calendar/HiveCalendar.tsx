"use client";
import FullCalendar, { type CalendarRef, type EventDropInfo } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import classicTheme from "@fullcalendar/react/themes/classic";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { utcToZoned } from "@/lib/dates";
import { rescheduleTask } from "./actions";

export type CalTask = { id: string; title: string; done: boolean; date: string; time: string | null; space: string; spaceName: string; color: string | null; tint?: string | null }; // tint: the importance colour

const VIEWS = [
  { id: "dayGridMonth", label: "Month" },
  { id: "timeGridWeek", label: "Week" },
  { id: "listMonth", label: "Agenda" },
] as const;

/** `embedded`: inside a team page, so no page heading, no "My Cell" filter. */
export function HiveCalendar({ tasks, tz, editable = true, embedded = false }: { tasks: CalTask[]; tz: string; editable?: boolean; embedded?: boolean }) {
  const ref = useRef<CalendarRef>(null);
  const router = useRouter();
  const [view, setView] = useState<string>("dayGridMonth");
  const [title, setTitle] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [, start] = useTransition();

  // phones open on the agenda: easier to read, and tasks move with the date picker on the task page
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) ref.current?.getApi().changeView("listMonth");
  }, []);

  const spaces = useMemo(() => {
    const m = new Map<string, { name: string; color: string | null }>();
    for (const t of tasks) m.set(t.space, { name: t.spaceName, color: t.color });
    if (!embedded && !m.has("cell")) m.set("cell", { name: "My Cell", color: null });
    return [...m.entries()];
  }, [tasks, embedded]);

  const events = tasks
    .filter((t) => !hidden.has(t.space))
    .map((t) => ({
      id: t.id, title: t.title, allDay: !t.time, start: t.time ? `${t.date}T${t.time}:00` : t.date,
      color: t.tint ?? t.color ?? "var(--accent)", contrastColor: readableOn(t.tint ?? t.color),
      backgroundColor: t.tint ?? t.color ?? "var(--accent)", borderColor: t.tint ?? t.color ?? "var(--accent-edge)",
      textColor: readableOn(t.tint ?? t.color), classNames: t.done ? ["is-done"] : [],
    }));

  function onDrop(info: EventDropInfo) {
    const iso = info.event.startStr; // UTC mode: these digits are the user's wall time
    const date = iso.slice(0, 10);
    const time = info.event.allDay ? null : iso.slice(11, 16);
    start(async () => {
      try {
        await rescheduleTask(info.event.id, date, time);
        setMessage(`Moved “${info.event.title}” to ${new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" })}.`);
        router.refresh();
      } catch (err) {
        info.revert();
        setMessage(err instanceof Error ? err.message : "Couldn't move that task.");
      }
    });
  }

  const api = () => ref.current?.getApi();
  const btn = "min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm font-medium hover:border-accent-edge";
  return (
    <>
      {!embedded && <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Calendar</h1>
          <p className="mt-1 text-muted">Every task with a due date. Drag one to another day to move it.</p>
        </div>
        <Link href="/settings#calendar-feed" className="text-sm text-accent-text underline underline-offset-4">Add to Google Calendar</Link>
      </div>}

      {tasks.length === 0 ? (
        <div className="mt-8">
          <EmptyState pose="idle" title="Nothing on the calendar yet" body="Tasks show up here once they have a due date. Try quick add on My Cell: “Read chapter 3 Thursday”." action={<Link href="/cell" className="inline-flex min-h-11 items-center rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent">Go to My Cell</Link>} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" className={btn} onClick={() => api()?.prev()} aria-label="Previous">‹</button>
              <button type="button" className={btn} onClick={() => api()?.today()}>Today</button>
              <button type="button" className={btn} onClick={() => api()?.next()} aria-label="Next">›</button>
              <h2 className="font-display ml-2 text-xl font-semibold" aria-live="polite">{title}</h2>
            </div>
            <div role="radiogroup" aria-label="View" className="flex gap-1">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" role="radio" aria-checked={view === v.id} onClick={() => api()?.changeView(v.id)} className={`${btn} aria-checked:border-accent-edge aria-checked:bg-raised`}>{v.label}</button>
              ))}
            </div>
          </div>

          {spaces.length > 1 && (
            <fieldset className="mt-4 flex flex-wrap gap-x-4">
              <legend className="sr-only">Show</legend>
              {spaces.map(([id, s]) => (
                <label key={id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={!hidden.has(id)} className="size-4 accent-[var(--accent)]"
                    onChange={(e) => setHidden((h) => { const n = new Set(h); if (e.target.checked) n.delete(id); else n.add(id); return n; })} />
                  <span aria-hidden className="size-3 rounded-sm" style={{ background: s.color ?? "var(--accent)" }} />
                  {s.name}
                </label>
              ))}
            </fieldset>
          )}

          <p className="mt-2 min-h-6 text-sm text-muted" aria-live="polite">{message}</p>

          <div className="hive-cal mt-2">
            <FullCalendar
              ref={ref}
              plugins={[classicTheme, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              timeZone="UTC"
              headerToolbar={false}
              height="auto"
              firstDay={1}
              dayMaxEvents={3}
              nowIndicator
              now={() => { const z = utcToZoned(new Date(), tz); return `${z.date}T${z.time}:00`; }} // "today" and the now-line in the user's zone
              scrollTime="08:00:00"
              editable={editable}
              eventDurationEditable={false}
              longPressDelay={350}
              eventLongPressDelay={350}
              events={events}
              eventDrop={onDrop}
              eventClick={(info) => { info.jsEvent.preventDefault(); router.push(`/tasks/${info.event.id}`); }}
              datesSet={(info) => { setTitle(info.view.title); setView(info.view.type); }}
              noEventsContent="No tasks due in this period."
              eventContent={(arg) => arg.view.type === "dayGridMonth"
                // month view: the task fills the day square, title wraps instead of being cut off
                ? <div style={{ background: arg.color || undefined, color: arg.contrastColor || undefined }} className="flex min-h-[4.5rem] w-full flex-col justify-start gap-0.5 overflow-hidden rounded-[6px] px-2 py-1.5 text-sm leading-snug font-semibold whitespace-normal sm:min-h-[5.5rem]">
                    {arg.timeText && <span className="text-xs font-medium opacity-80">{arg.timeText}</span>}
                    <span className="line-clamp-4 break-words">{arg.event.title}</span>
                  </div>
                : undefined}
            />
          </div>
          <p className="mt-3 text-sm text-muted">On a phone, press and hold a task to drag it, or open it and change the due date.</p>
        </>
      )}
    </>
  );
}

/** Dark or white text, whichever reads better on a #rrggbb fill (CSS variables keep the theme's on-accent). */
function readableOn(bg: string | null | undefined) {
  if (!bg || !/^#[0-9a-f]{6}$/i.test(bg)) return "var(--on-accent)";
  const [r, g, b] = [1, 3, 5].map((i) => { const c = parseInt(bg.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? "#17171a" : "#ffffff";
}
