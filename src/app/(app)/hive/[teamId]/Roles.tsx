"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PERMS } from "@/lib/hive-perms";
import { deleteRole, saveRole } from "../actions";
import { nameOf, type MemberT, type RoleT, type TeamT } from "./types";

const field = "min-h-11 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge disabled:opacity-70";
const btnPrimary = "min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60";

/** Leader only: one card listing the team's roles. Open a role to rename it and tick its powers. */
export function Roles({ team, roles, members }: { team: TeamT; roles: RoleT[]; members: MemberT[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="roles-h" className="rounded-[var(--radius)] border border-line bg-surface">
      <div className="p-5">
        <h2 id="roles-h" className="font-display text-xl font-semibold">Roles</h2>
        <p className="mt-1 text-muted">Tap a role to rename it or change its powers. Only you, the Leader, can give people roles: do that in the Hierarchy tab. Anyone without a role is a plain member.</p>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {roles.map((r) => <RoleRow key={r.id} team={team} role={r} holders={members.filter((m) => m.roleId === r.id)} />)}
        {adding && <RoleRow team={team} role={null} holders={[]} onDone={() => setAdding(false)} />}
      </ul>
      {!adding && (
        <div className="border-t border-line p-4">
          <button type="button" onClick={() => setAdding(true)} className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">+ New role</button>
        </div>
      )}
    </section>
  );
}

function RoleRow({ team, role, holders, onDone }: { team: TeamT; role: RoleT | null; holders: MemberT[]; onDone?: () => void }) {
  const router = useRouter();
  const [perms, setPerms] = useState<string[]>(role?.perms ?? ["post", "vault"]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = Boolean(role?.isLeader);
  const summary = locked ? "Every power" : `${(role?.perms ?? perms).length} of ${PERMS.length} powers`;
  return (
    <li>
      <details open={!role} className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-raised [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="text-muted transition-transform group-open:rotate-90">›</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{role ? role.name : "New role"}{locked && role && role.name.toLowerCase() !== "leader" && <span className="font-normal text-muted"> (Leader)</span>}</span>
            {role && <span className="block truncate text-sm text-muted">{summary}{holders.length ? `, ${holders.map(nameOf).join(", ")}` : ""}</span>}
          </span>
        </summary>
        <form className="grid gap-4 px-5 pb-5 pl-10" onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget, f = new FormData(form);
          start(async () => {
            try {
              await saveRole(team.id, { id: role?.id, name: String(f.get("name")), perms, applyToMembers: f.get("apply") === "on" });
              setMsg(role ? "Saved." : null);
              if (!role) onDone?.();
              router.refresh();
            } catch (x) { setMsg(x instanceof Error ? x.message : "Couldn't save."); }
          });
        }}>
          <label className="grid gap-1"><span className="text-sm font-medium">Role name</span>
            <input name="name" defaultValue={role?.name ?? ""} placeholder="e.g. Secretary" required maxLength={40} autoFocus={!role} className={field} />
          </label>
          {locked ? (
            <p className="text-sm text-muted">The Leader is the team&apos;s admin and always has every power. You can still rename it.</p>
          ) : (
            <fieldset className="grid gap-0.5 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-medium">Powers</legend>
              {PERMS.map((p) => (
                <label key={p.key} className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" className="size-5 shrink-0 accent-[var(--accent)]" checked={perms.includes(p.key)} onChange={(e) => setPerms((x) => (e.target.checked ? [...x, p.key] : x.filter((k) => k !== p.key)))} />
                  {p.label}
                </label>
              ))}
            </fieldset>
          )}
          {role && !locked && holders.length > 0 && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="apply" defaultChecked className="size-5 accent-[var(--accent)]" /> Also give these powers to the {holders.length} {holders.length === 1 ? "person" : "people"} with this role</label>}
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending} className={btnPrimary}>{pending ? "Saving…" : role ? "Save role" : "Add role"}</button>
            {!role && <button type="button" onClick={onDone} className="min-h-11 rounded-[var(--radius)] border border-line px-3 text-muted hover:border-accent-edge hover:text-ink">Cancel</button>}
            {role && !locked && <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete the ${role.name} role? ${holders.length ? "The people who have it become plain members but keep their current powers." : ""}`)) start(async () => { await deleteRole(role.id); router.refresh(); }); }} className="ml-auto min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm text-muted hover:border-danger hover:text-danger">Delete role</button>}
          </div>
          <p role="status" className="text-sm text-muted">{msg}</p>
        </form>
      </details>
    </li>
  );
}
