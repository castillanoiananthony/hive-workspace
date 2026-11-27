"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PERMS } from "@/lib/hive-perms";
import { deleteRole, saveRole } from "../actions";
import type { RoleT, TeamT } from "./types";

/** Admin only: the team's roles and the powers each one starts with. */
export function Roles({ team, roles }: { team: TeamT; roles: RoleT[] }) {
  return (
    <section aria-labelledby="roles-h" className="grid gap-4">
      <div>
        <h2 id="roles-h" className="font-display text-xl font-semibold">Roles</h2>
        <p className="mt-1 max-w-[60ch] text-muted">A role is a starting set of powers. Give someone a role in the Hierarchy tab; fine-tune one person with their Hive control button.</p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {roles.map((r) => <RoleCard key={r.id} team={team} role={r} />)}
        <RoleCard team={team} role={null} />
      </ul>
    </section>
  );
}

function RoleCard({ team, role }: { team: TeamT; role: RoleT | null }) {
  const router = useRouter();
  const [perms, setPerms] = useState<string[]>(role?.perms ?? ["post"]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = role?.name === "Leader"; // the admin's role always has everything
  return (
    <li className="rounded-[var(--radius)] border border-line bg-surface p-4">
      <form className="grid gap-3" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          try {
            await saveRole(team.id, { id: role?.id, name: String(f.get("name")), perms, applyToMembers: f.get("apply") === "on" });
            setMsg(role ? "Saved." : "Role added.");
            if (!role) { e.currentTarget?.reset?.(); setPerms(["post"]); }
            router.refresh();
          } catch (x) { setMsg(x instanceof Error ? x.message : "Couldn't save."); }
        });
      }}>
        <label className="grid gap-1"><span className="text-sm font-medium">{role ? "Role name" : "New role"}</span>
          <input name="name" defaultValue={role?.name ?? ""} placeholder="e.g. Secretary" required maxLength={40} disabled={locked}
            className="min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge disabled:opacity-70" />
        </label>
        <fieldset className="grid gap-0.5" disabled={locked}>
          <legend className="mb-1 text-sm font-medium">{locked ? "The Leader is the admin and has every power." : "Powers"}</legend>
          {PERMS.map((p) => (
            <label key={p.key} className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={locked || perms.includes(p.key)} onChange={(e) => setPerms((x) => (e.target.checked ? [...x, p.key] : x.filter((k) => k !== p.key)))} />
              {p.label}
            </label>
          ))}
        </fieldset>
        {!locked && (
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">{role ? "Save role" : "Add role"}</button>
            {role && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="apply" className="size-4 accent-[var(--accent)]" /> Also update everyone who has this role</label>}
            {role && <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete the ${role.name} role? People keep their current powers.`)) start(async () => { await deleteRole(role.id); router.refresh(); }); }} className="ml-auto min-h-11 text-sm text-muted hover:text-danger">Delete</button>}
          </div>
        )}
        <p role="status" className="text-sm text-muted">{msg}</p>
      </form>
    </li>
  );
}
