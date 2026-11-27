"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { PERMS } from "@/lib/hive-perms";
import { saveHierarchy, setMemberPerms, setMemberRole, setNickname } from "../actions";
import { MemberAvatar } from "./MemberAvatar";
import { has, nameOf, type MeT, type MemberT, type RoleT, type TeamT } from "./types";

type Layout = Record<string, { parentId: string | null; position: number }>;
type Row = { m: MemberT; depth: number };

function rowsOf(members: MemberT[], layout: Layout): Row[] {
  const kids = (pid: string | null) => members.filter((m) => (layout[m.id]?.parentId ?? null) === pid).sort((a, b) => layout[a.id].position - layout[b.id].position);
  const out: Row[] = [];
  const seen = new Set<string>();
  const walk = (pid: string | null, depth: number) => { for (const m of kids(pid)) { if (seen.has(m.id)) continue; seen.add(m.id); out.push({ m, depth }); walk(m.id, depth + 1); } };
  walk(null, 0);
  for (const m of members) if (!seen.has(m.id)) out.push({ m, depth: 1 }); // anyone orphaned still shows
  return out;
}

export function Hierarchy({ team, members, roles, me }: { team: TeamT; members: MemberT[]; roles: RoleT[]; me: MeT }) {
  const router = useRouter();
  const admin = members.find((m) => m.isAdmin);
  // the admin is always the root; anyone without a leader sits under the admin
  const initial = useMemo<Layout>(() => Object.fromEntries(members.map((m) => [m.id, { parentId: m.isAdmin ? null : m.parentId ?? admin?.id ?? null, position: m.position }])), [members, admin]);
  const [layout, setLayout] = useState<Layout>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [control, setControl] = useState<MemberT | null>(null);
  const [, start] = useTransition();
  const canEdit = has(me, "hierarchy");
  const rows = rowsOf(members, layout);
  // pointer drag (works for mouse and touch): press the handle, move over a row, let go
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; mode: "before" | "inside" } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isUnder = (id: string, maybeAncestor: string, l: Layout) => { for (let cur = l[id]?.parentId; cur; cur = l[cur]?.parentId ?? null) if (cur === maybeAncestor) return true; return false; };

  function commit(next: Layout, note: string) {
    // renumber siblings 0..n so positions stay tidy
    const groups = new Map<string | null, string[]>();
    for (const [id, v] of Object.entries(next)) groups.set(v.parentId, [...(groups.get(v.parentId) ?? []), id]);
    for (const ids of groups.values()) ids.sort((a, b) => next[a].position - next[b].position).forEach((id, i) => { next[id] = { ...next[id], position: i }; });
    setLayout(next);
    setMsg(note);
    start(async () => {
      try { await saveHierarchy(team.id, Object.entries(next).map(([id, v]) => ({ id, ...v }))); router.refresh(); }
      catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't save the chart."); setLayout(initial); }
    });
  }
  const siblings = (id: string, l: Layout) => Object.keys(l).filter((k) => l[k].parentId === l[id].parentId).sort((a, b) => l[a].position - l[b].position);
  const label = (id: string) => nameOf(members.find((m) => m.id === id)!);

  function move(id: string, dir: -1 | 1) {
    const sib = siblings(id, layout), i = sib.indexOf(id), j = i + dir;
    if (j < 0 || j >= sib.length) return;
    commit({ ...layout, [id]: { ...layout[id], position: layout[sib[j]].position }, [sib[j]]: { ...layout[sib[j]], position: layout[id].position } }, `Moved ${label(id)} ${dir < 0 ? "up" : "down"}.`);
  }
  function indent(id: string) {
    const sib = siblings(id, layout), i = sib.indexOf(id);
    if (i <= 0) return setMsg(`${label(id)} needs someone above them at the same level to go under.`);
    commit({ ...layout, [id]: { parentId: sib[i - 1], position: 9999 } }, `${label(id)} now reports to ${label(sib[i - 1])}.`);
  }
  function outdent(id: string) {
    const parent = layout[id].parentId;
    if (!parent || parent === admin?.id) return setMsg(`${label(id)} is already right under the admin.`);
    commit({ ...layout, [id]: { parentId: layout[parent].parentId, position: layout[parent].position + 0.5 } }, `${label(id)} moved up a level.`);
  }
  function dropOn(id: string, target: string, mode: "before" | "inside") {
    if (id === target || isUnder(target, id, layout)) return setMsg(`${label(id)} can't go under someone who reports to them.`);
    if (mode === "inside") commit({ ...layout, [id]: { parentId: target, position: 9999 } }, `${label(id)} now reports to ${label(target)}.`);
    else if (target === admin?.id) commit({ ...layout, [id]: { parentId: admin.id, position: -1 } }, `${label(id)} now reports to ${label(admin.id)}.`);
    else commit({ ...layout, [id]: { parentId: layout[target].parentId, position: layout[target].position - 0.5 } }, `Moved ${label(id)} above ${label(target)}.`);
  }
  // which row is under the finger/mouse, and whether that means "under them" (right part) or "above them" (left part)
  function targetAt(x: number, y: number): { id: string; mode: "before" | "inside" } | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-member]");
    const id = el?.dataset.member;
    if (!el || !id || id === dragging) return null;
    const depth = Number(el.dataset.depth ?? 0), r = el.getBoundingClientRect();
    const target = members.find((m) => m.id === id);
    return { id, mode: target?.isAdmin || x - r.left > depth * 24 + 96 ? "inside" : "before" };
  }
  function onHandleDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
    setMsg(`Moving ${label(id)}: drop on someone to put them under that person.`);
  }
  function onHandleMove(e: React.PointerEvent) { if (dragging) setDrop(targetAt(e.clientX, e.clientY)); }
  function onHandleUp(e: React.PointerEvent) {
    if (!dragging) return;
    const t = targetAt(e.clientX, e.clientY);
    const id = dragging;
    setDragging(null); setDrop(null);
    if (t) dropOn(id, t.id, t.mode); else setMsg(null);
  }
  // keyboard: focus the handle, then arrows move (↑ ↓ order, → under the person above, ← up a level)
  function onHandleKey(e: React.KeyboardEvent, id: string) {
    const act: Record<string, () => void> = { ArrowUp: () => move(id, -1), ArrowDown: () => move(id, 1), ArrowRight: () => indent(id), ArrowLeft: () => outdent(id) };
    if (act[e.key]) { e.preventDefault(); act[e.key](); }
  }

  const roleName = (m: MemberT) => (m.isAdmin ? "Admin" : roles.find((r) => r.id === m.roleId)?.name ?? "No role");

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      {/* left: the outline. Indent = how far down the chain someone is */}
      <section aria-labelledby="outline-h" className="min-w-0 self-start rounded-[var(--radius)] border border-line bg-surface p-4">
        <h2 id="outline-h" className="font-display text-lg font-semibold">Who reports to whom</h2>
        <p className="mt-1 text-sm text-muted">{canEdit ? "Hold the ⠿ handle and drag a name onto someone to put them under that person. Drop on the left part of a row to put them above it instead." : "Only people allowed to edit the hierarchy can change it."}</p>
        <p role="status" className="mt-2 min-h-5 text-sm text-accent-text">{msg}</p>
        <ul ref={listRef} className={`mt-2 grid gap-1 ${dragging ? "select-none" : ""}`}>
          {rows.map(({ m, depth }) => {
            const isDrop = drop?.id === m.id;
            return (
              <li key={m.id} data-member={m.id} data-depth={depth} style={{ paddingLeft: depth * 24 }}
                className={`relative min-w-0 rounded-[var(--radius)] ${dragging === m.id ? "opacity-50" : ""} ${isDrop && drop.mode === "before" ? "shadow-[0_-3px_0_0_var(--accent)]" : ""} ${isDrop && drop.mode === "inside" ? "bg-raised outline-2 outline-accent-edge" : ""}`}>
                <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius)] py-1.5 pr-1">
                  {canEdit && !m.isAdmin ? (
                    <button type="button" aria-label={`Move ${nameOf(m)}. Drag, or use arrow keys`} title="Drag to move"
                      onPointerDown={(e) => onHandleDown(e, m.id)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={() => { setDragging(null); setDrop(null); }}
                      onKeyDown={(e) => onHandleKey(e, m.id)}
                      className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-[var(--radius)] text-lg text-muted hover:bg-raised hover:text-ink active:cursor-grabbing">⠿</button>
                  ) : <span className="w-11 shrink-0" />}
                  <MemberAvatar m={m} color={team.color} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{nameOf(m)}{m.nickname ? <span className="font-normal text-muted"> ({m.name})</span> : null}</span>
                    <span className="block truncate text-xs text-muted">{roleName(m)}{m.joined ? "" : ", invited"}</span>
                  </span>
                </div>
                <MemberControls m={m} me={me} roles={roles} onControl={() => setControl(m)} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* right: the chart */}
      <section aria-labelledby="chart-h" className="min-w-0 rounded-[var(--radius)] border border-line bg-surface p-4">
        <h2 id="chart-h" className="font-display text-lg font-semibold">Team chart</h2>
        <div className="mt-4 overflow-x-auto pb-4">
          <div className="org mx-auto w-max min-w-full">
            <Tree parentId={null} members={members} layout={layout} color={team.color} roleName={roleName} />
          </div>
        </div>
      </section>

      {control && <HiveControl m={control} onClose={() => setControl(null)} />}
    </div>
  );
}

function Tree({ parentId, members, layout, color, roleName }: { parentId: string | null; members: MemberT[]; layout: Layout; color: string; roleName: (m: MemberT) => string }) {
  const kids = members.filter((m) => (layout[m.id]?.parentId ?? null) === parentId).sort((a, b) => layout[a.id].position - layout[b.id].position);
  if (!kids.length) return null;
  return (
    <ul>
      {kids.map((m) => (
        <li key={m.id}>
          <div className="inline-flex w-32 flex-col items-center gap-1 px-1">
            <MemberAvatar m={m} color={color} size={m.isAdmin ? 72 : 56} />
            <span className="w-full truncate text-sm font-semibold">{nameOf(m)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${m.isAdmin ? "bg-accent text-on-accent" : "bg-raised text-muted"}`}>{roleName(m)}</span>
          </div>
          <Tree parentId={m.id} members={members} layout={layout} color={color} roleName={roleName} />
        </li>
      ))}
    </ul>
  );
}

/** Role picker, nickname and the admin's "Hive control" button, shown under each person in the outline. */
function MemberControls({ m, me, roles, onControl }: { m: MemberT; me: MeT; roles: RoleT[]; onControl: () => void }) {
  const router = useRouter();
  const [nick, setNick] = useState(false);
  const [pending, start] = useTransition();
  const canNick = has(me, "nicknames") || m.id === me.memberId;
  const canRole = me.isAdmin && !m.isAdmin; // only the Leader hands out roles
  if (!canNick && !canRole && !(me.isAdmin && !m.isAdmin)) return null;
  return (
    <div className="mb-1 ml-14 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {canRole && (
        <label className="flex items-center gap-1"><span className="sr-only">Role for {nameOf(m)}</span>
          <select value={m.roleId ?? ""} disabled={pending} onChange={(e) => start(async () => { await setMemberRole(m.id, e.target.value); router.refresh(); })}
            className="min-h-9 rounded-[var(--radius)] border border-line bg-bg px-2 text-sm">
            <option value="">Member (no role)</option>
            {roles.filter((r) => !r.isLeader).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
      )}
      {canNick && (nick ? (
        <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("nick")); start(async () => { await setNickname(m.id, v); setNick(false); router.refresh(); }); }}>
          <label className="sr-only" htmlFor={`nick-${m.id}`}>Nickname for {m.name}</label>
          <input id={`nick-${m.id}`} name="nick" defaultValue={m.nickname ?? ""} maxLength={40} autoFocus placeholder="Nickname" className="min-h-9 w-32 rounded-[var(--radius)] border border-line bg-bg px-2 text-sm" />
          <button className="min-h-9 rounded-[var(--radius)] border border-line px-2">Save</button>
        </form>
      ) : <button type="button" onClick={() => setNick(true)} className="min-h-9 px-1 text-muted hover:text-ink">{m.nickname ? "Edit nickname" : "Add nickname"}</button>)}
      {me.isAdmin && !m.isAdmin && <button type="button" onClick={onControl} className="min-h-9 rounded-[var(--radius)] border border-line px-2 font-medium hover:border-accent-edge">Hive control</button>}
    </div>
  );
}

/** The admin's per-person switches: exactly what this member may do in the team. */
function HiveControl({ m, onClose }: { m: MemberT; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [perms, setPerms] = useState<string[]>(m.perms);
  const [pending, start] = useTransition();
  return (
    <dialog ref={(d) => { ref.current = d; if (d && !d.open) d.showModal(); }} onClose={onClose} aria-labelledby="hc-h"
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(32rem,calc(100%-1.5rem))] overflow-y-auto rounded-[var(--radius)] border border-line bg-raised p-0 text-ink backdrop:bg-black/60">
      <form className="grid gap-3 p-6" onSubmit={(e) => { e.preventDefault(); start(async () => { await setMemberPerms(m.id, perms); router.refresh(); ref.current?.close(); }); }}>
        <h2 id="hc-h" className="font-display text-xl font-semibold">Hive control: {nameOf(m)}</h2>
        <p className="text-sm text-muted">Tick what {nameOf(m)} may do in this team. Changing their role later resets these to the role&apos;s set.</p>
        <fieldset className="grid gap-1">
          <legend className="sr-only">Powers</legend>
          {PERMS.map((p) => (
            <label key={p.key} className="flex min-h-11 items-start gap-3 rounded-[var(--radius)] p-2 hover:bg-surface">
              <input type="checkbox" className="mt-1 size-5 accent-[var(--accent)]" checked={perms.includes(p.key)} onChange={(e) => setPerms((x) => (e.target.checked ? [...x, p.key] : x.filter((k) => k !== p.key)))} />
              <span><span className="block font-medium">{p.label}</span><span className="block text-sm text-muted">{p.hint}</span></span>
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="min-h-11 px-4 text-muted hover:text-ink">Cancel</button>
          <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </dialog>
  );
}
