"use client";
import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ROLE_PRESETS } from "@/lib/hive-perms";
import { TEAM_COLORS_CLIENT } from "./colors";
import { createTeam } from "./actions";

export function NewTeamButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const [colorPick, setColor] = useState<string>(TEAM_COLORS_CLIENT[0]);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([...ROLE_PRESETS[0].roles]);
  const [pending, start] = useTransition();
  return (
    <>
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
            start(async () => { try { await createTeam({ name, color: colorPick, roles }); } catch (err) { unstable_rethrow(err); ref.current?.showModal(); setError(err instanceof Error ? err.message : "Couldn't create the team."); } });
          }}
        >
          <h2 id="new-team-h" className="font-display text-xl font-semibold">New team</h2>
          <label className="grid gap-2"><span className="text-sm font-medium">Team name</span>
            <input name="name" required maxLength={80} autoFocus placeholder="Physics lab group" className="min-h-12 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge" />
          </label>
          <ColorPicker value={colorPick} onChange={setColor} />
          <RolePicker roles={roles} onChange={setRoles} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="min-h-11 px-4 text-muted hover:text-ink">Cancel</button>
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
              : <button type="button" onClick={() => onChange(roles.filter((_, j) => j !== i))} className="min-h-11 w-20 shrink-0 text-sm text-muted hover:text-danger" aria-label={`Remove ${r || "this role"}`}>Remove</button>}
          </li>
        ))}
      </ol>
      {roles.length < 12 && <button type="button" onClick={() => onChange([...roles, ""])} className="min-h-11 justify-self-start px-1 text-sm font-medium text-accent-text hover:underline">+ Add a role</button>}
      <p className="text-sm text-muted">The first role is you, the Leader. You can rename roles and choose what each one may do later in Team settings.</p>
    </fieldset>
  );
}
