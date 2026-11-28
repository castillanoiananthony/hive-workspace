"use client";
import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { ROLE_PRESETS } from "@/lib/hive-perms";
import { planMilestones, TEMPLATES, type Kind, type PlannedMilestone } from "@/lib/hive-templates";
import { TEAM_COLORS_CLIENT } from "./colors";
import { createTeam } from "./actions";

export function NewTeamButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const [colorPick, setColor] = useState<string>(TEAM_COLORS_CLIENT[0]);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([...ROLE_PRESETS[0].roles]);
  const [kind, setKind] = useState<Kind>("blank");
  const [milestones, setMilestones] = useState<PlannedMilestone[]>([]);
  const [pending, start] = useTransition();
  return (
    <>
      <BusyOverlay show={pending} label="Creating your team…" />
      <button type="button" onClick={() => ref.current?.showModal()} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">New team</button>
      <dialog ref={ref} aria-labelledby="new-team-h" className="m-auto max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100%-2rem))] overflow-x-hidden overflow-y-auto rounded-[var(--radius)] border border-line bg-raised p-0 text-ink backdrop:bg-black/60">
        <form
          className="grid gap-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name"));
            setError(null);
            // close first: Next keeps the old page mounted (hidden) after navigating, and an open modal would block the new one
            ref.current?.close();
            start(async () => { try { await createTeam({ name, color: colorPick, roles, kind, milestones }); } catch (err) { unstable_rethrow(err); ref.current?.showModal(); setError(err instanceof Error ? err.message : "Couldn't create the team."); } });
          }}
        >
          <h2 id="new-team-h" className="font-display text-xl font-semibold">New team</h2>
          <label className="grid gap-2"><span className="text-sm font-medium">Team name</span>
            <input name="name" required maxLength={80} autoFocus placeholder="Physics lab group" className="min-h-12 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge" />
          </label>
          <TemplatePicker kind={kind} onKind={setKind} milestones={milestones} onMilestones={setMilestones} />
          <ColorPicker value={colorPick} onChange={setColor} />
          <RolePicker roles={roles} onChange={setRoles} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="min-h-11 rounded-[var(--radius)] border border-line px-4 text-muted hover:border-accent-edge hover:text-ink">Cancel</button>
            <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent disabled:opacity-60">{pending ? "Creating…" : "Create team"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium">Colour</legend>
      <div role="radiogroup" aria-label="Team colour" className="flex flex-wrap gap-2">
        {TEAM_COLORS_CLIENT.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={`Colour ${i + 1}`} onClick={() => onChange(c)}
            className="grid size-11 place-items-center rounded-full border-2 border-transparent aria-checked:border-ink">
            <span className="size-7 rounded-full" style={{ background: c }} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Roles for a new team: pick a preset, then rename, remove or add. The first role is the Leader (you). */
function RolePicker({ roles, onChange }: { roles: string[]; onChange: (r: string[]) => void }) {
  const set = (i: number, v: string) => onChange(roles.map((r, j) => (j === i ? v : r)));
  return (
    <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <legend className="mb-1 text-sm font-medium">Roles</legend>
      <div className="flex flex-wrap gap-2">
        {ROLE_PRESETS.map((p) => (
          <button key={p.id} type="button" aria-pressed={roles.join("|") === p.roles.join("|")} onClick={() => onChange([...p.roles])}
            className="min-h-11 rounded-full border border-line px-3 text-sm hover:border-accent-edge aria-pressed:border-accent-edge aria-pressed:bg-raised aria-pressed:font-semibold">{p.label}</button>
        ))}
      </div>
      <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {roles.map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`role-${i}`}>{i === 0 ? "Leader role name" : `Role ${i + 1} name`}</label>
            <input id={`role-${i}`} value={r} onChange={(e) => set(i, e.target.value)} maxLength={40} required={i === 0}
              className="min-h-11 min-w-0 flex-1 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge" />
            {i === 0 ? <span className="w-20 shrink-0 text-sm text-muted">You</span>
              : <button type="button" onClick={() => onChange(roles.filter((_, j) => j !== i))} className="min-h-11 w-20 shrink-0 rounded-[var(--radius)] border border-line text-sm text-muted hover:border-danger hover:text-danger" aria-label={`Remove ${r || "this role"}`}>Remove</button>}
          </li>
        ))}
      </ol>
      {roles.length < 12 && <button type="button" onClick={() => onChange([...roles, ""])} className="min-h-11 justify-self-start rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm font-medium text-accent-text">+ Add a role</button>}
      <p className="text-sm text-muted">The first role is you, the Leader. You can rename roles and choose what each one may do later in Team settings.</p>
    </fieldset>
  );
}

const fieldCls = "min-h-11 min-w-0 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";

/** Hackathon / competition / software project / blank, with suggested milestones you can edit before creating the team. */
function TemplatePicker({ kind, onKind, milestones, onMilestones }: { kind: Kind; onKind: (k: Kind) => void; milestones: PlannedMilestone[]; onMilestones: (m: PlannedMilestone[]) => void }) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10)); // fixed when the box opens
  const [start, setStart] = useState(today), [startTime, setStartTime] = useState("09:00"), [hours, setHours] = useState(36);
  const [end, setEnd] = useState(() => new Date(Date.parse(today) + 60 * 86_400_000).toISOString().slice(0, 10)), [sprints, setSprints] = useState(4);
  const replan = (k: Kind, o: Partial<{ start: string; startTime: string; hours: number; end: string; sprints: number }> = {}) =>
    onMilestones(planMilestones(k, { start, startTime, hours, end, sprints, ...o }));
  const set = (i: number, patch: Partial<PlannedMilestone>) => onMilestones(milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <legend className="mb-1 text-sm font-medium">Template</legend>
      <div role="radiogroup" aria-label="Template" className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={kind === t.id} onClick={() => { onKind(t.id); replan(t.id); }}
            className="grid gap-0.5 rounded-[var(--radius)] border border-line px-3 py-2 text-left hover:border-accent-edge aria-checked:border-accent-edge aria-checked:bg-raised">
            <span className="text-sm font-semibold">{t.label}</span><span className="text-xs text-muted">{t.hint}</span>
          </button>
        ))}
      </div>
      {kind === "hackathon" && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="grid gap-1 text-sm"><span>Kickoff</span><input type="date" value={start} onChange={(e) => { setStart(e.target.value); replan(kind, { start: e.target.value }); }} className={`${fieldCls} compact-dt`} /></label>
          <label className="grid gap-1 text-sm"><span>Time</span><input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); replan(kind, { startTime: e.target.value }); }} className={`${fieldCls} compact-dt`} /></label>
          <label className="col-span-2 grid gap-1 text-sm sm:col-span-1"><span>Length</span><select value={hours} onChange={(e) => { setHours(Number(e.target.value)); replan(kind, { hours: Number(e.target.value) }); }} className={fieldCls}>{[24, 36, 48, 72].map((h) => <option key={h} value={h}>{h} hours</option>)}</select></label>
        </div>
      )}
      {kind === "competition" && (
        <label className="grid gap-1 text-sm"><span>Final submission date</span><input type="date" value={end} onChange={(e) => { setEnd(e.target.value); replan(kind, { start: today, end: e.target.value }); }} className={fieldCls} /></label>
      )}
      {kind === "project" && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <label className="grid gap-1 text-sm"><span>Start</span><input type="date" value={start} onChange={(e) => { setStart(e.target.value); replan(kind, { start: e.target.value }); }} className={fieldCls} /></label>
          <label className="grid gap-1 text-sm"><span>Two-week sprints</span><select value={sprints} onChange={(e) => { setSprints(Number(e.target.value)); replan(kind, { sprints: Number(e.target.value) }); }} className={fieldCls}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
      )}
      {milestones.length > 0 && (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Milestones">
          {milestones.map((m, i) => (
            <li key={i} className={`grid gap-1.5 rounded-[var(--radius)] border border-line p-2 ${m.time !== null ? "grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]"}`}>
              <div className="col-span-full flex gap-1.5">
                <input aria-label={`Milestone ${i + 1}`} placeholder="Milestone name" value={m.title} onChange={(e) => set(i, { title: e.target.value })} maxLength={120} className={`${fieldCls} min-w-0 flex-1`} />
                <button type="button" aria-label={`Remove ${m.title}`} onClick={() => onMilestones(milestones.filter((_, j) => j !== i))} className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] border border-line text-muted hover:border-danger hover:text-danger">×</button>
              </div>
              <input aria-label={`${m.title} date`} type="date" value={m.date} onChange={(e) => set(i, { date: e.target.value })} className={`${fieldCls} compact-dt`} />
              {m.time !== null && <input aria-label={`${m.title} time`} type="time" value={m.time} onChange={(e) => set(i, { time: e.target.value })} className={`${fieldCls} compact-dt`} />}
            </li>
          ))}
        </ol>
      )}
      {kind !== "blank" && <button type="button" onClick={() => onMilestones([...milestones, { title: "", date: milestones.at(-1)?.date ?? today, time: kind === "hackathon" ? "12:00" : null }])} className="min-h-10 justify-self-start rounded-[var(--radius)] border border-accent-edge/70 px-3 text-sm font-medium text-accent-text hover:bg-accent/10">+ Add a milestone</button>}
    </fieldset>
  );
}
