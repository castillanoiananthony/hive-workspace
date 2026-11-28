"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bee } from "@/components/brand/Bee";
import { KINDS, linkKind, VAULT_CATEGORIES, type Kind } from "@/lib/link-kind";
import { setLinkMeta } from "../team-extras-actions";
import { addVaultLink, deleteVaultLink } from "../actions";
import { has, nameOf, type MeT, type MemberT, type TeamT } from "./types";

export type VaultLink = { id: string; title: string; url: string; note: string | null; memberId: string | null; at: string; pinned?: boolean; category?: string | null };
const field = "min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";

/** Hive Vault: the team's shared links, grouped by where they live (Drive, GitHub, Docs…). */
export function Vault({ team, links, members, me }: { team: TeamT; links: VaultLink[]; members: MemberT[]; me: MeT }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canAdd = has(me, "vault");
  const who = (id: string | null) => { const m = members.find((x) => x.id === id); return m ? nameOf(m) : "a former member"; };
  const [cat, setCat] = useState("");
  const shown = links.filter((l) => (!q.trim() || `${l.title} ${l.note ?? ""} ${l.url}`.toLowerCase().includes(q.trim().toLowerCase())) && (!cat || l.category === cat));
  const pinned = shown.filter((l) => l.pinned);
  const cats = VAULT_CATEGORIES.filter((c) => links.some((l) => l.category === c));
  const groups = (Object.keys(KINDS) as Kind[]).map((k) => ({ k, items: shown.filter((l) => linkKind(l.url) === k) })).filter((g) => g.items.length);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Hive Vault</h2>
            <p className="text-muted">Everything the team works from, in one place.</p>
          </div>
          {links.length > 4 && (<><label htmlFor="vault-q" className="sr-only">Search the Vault</label><input id="vault-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search links" className={`${field} w-full sm:w-64`} /></>)}
        </div>
        {cats.length > 0 && (
          <div role="radiogroup" aria-label="Category" className="mt-4 flex flex-wrap gap-1.5">
            {["", ...cats].map((c) => <button key={c || "all"} type="button" role="radio" aria-checked={cat === c} onClick={() => setCat(c)} className="min-h-9 rounded-full border border-line px-3 text-sm font-medium hover:border-accent-edge aria-checked:border-accent-edge aria-checked:bg-raised">{c || "All"}</button>)}
          </div>
        )}
        {pinned.length > 0 && (
          <section aria-labelledby="vault-pinned" className="mt-6">
            <h3 id="vault-pinned" className="mb-2 flex items-center gap-2 font-semibold"><svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M9 3h6l-1 6 3 4H7l3-4z" /></svg>Pinned</h3>
            <ul className="grid gap-2">{pinned.map((l) => <li key={l.id} className="flex min-w-0 items-center gap-3 rounded-[var(--radius)] border border-accent-edge/60 bg-surface px-4 py-3"><a href={l.url} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 font-medium break-words hover:underline">{l.title}<span className="sr-only"> (opens in a new tab)</span></a>{l.category && <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold">{l.category}</span>}</li>)}</ul>
          </section>
        )}
        {links.length === 0 ? (
          <div className="mt-6 grid justify-items-center gap-2 rounded-[var(--radius)] border border-dashed border-line p-8 text-center">
            <Bee pose="idle" size={80} />
            <p className="font-display text-lg font-semibold">Nothing in the Vault yet</p>
            <p className="max-w-[44ch] text-muted">{canAdd ? "Add the team's Google Drive folder, GitHub repo, slides or anything else everyone keeps asking for." : "When someone adds the team's Drive folder or GitHub repo, it shows up here."}</p>
          </div>
        ) : groups.length === 0 ? <p className="mt-6 text-muted">No links match “{q}”.</p> : (
          <div className="mt-6 grid gap-6">
            {groups.map(({ k, items }) => (
              <section key={k} aria-labelledby={`vault-${k}`}>
                <h3 id={`vault-${k}`} className="mb-2 font-semibold">{KINDS[k]} <span className="font-normal text-muted">({items.length})</span></h3>
                <ul className="grid gap-2">
                  {items.map((l) => (
                    <li key={l.id} className="flex min-w-0 flex-wrap items-start gap-3 rounded-[var(--radius)] border border-line bg-surface p-4">
                      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-raised text-sm font-bold text-accent-text">{KINDS[k].split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                      <div className="min-w-0 flex-1 basis-48">
                        <a href={l.url} target="_blank" rel="noreferrer noopener" className="font-medium break-words hover:underline">{l.title}<span className="sr-only"> (opens in a new tab)</span></a>
                        {l.note && <p className="mt-0.5 text-sm">{l.note}</p>}
                        <p className="mt-0.5 truncate text-sm text-muted">{new URL(l.url).hostname.replace(/^www\./, "")}, added by {who(l.memberId)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <a href={l.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-3 text-sm font-medium hover:border-accent-edge">Open</a>
                        {canAdd && <button type="button" aria-pressed={Boolean(l.pinned)} aria-label={l.pinned ? `Unpin ${l.title}` : `Pin ${l.title}`} title={l.pinned ? "Unpin" : "Pin to the top"} disabled={pending} onClick={() => start(async () => { await setLinkMeta(l.id, { pinned: !l.pinned }); router.refresh(); })} className={`grid size-11 place-items-center rounded-[var(--radius)] border ${l.pinned ? "border-accent-edge text-accent-text" : "border-line text-muted hover:text-ink"}`}><svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M9 3h6l-1 6 3 4H7l3-4z" /></svg></button>}
                        {canAdd && <><label className="sr-only" htmlFor={`cat-${l.id}`}>Category for {l.title}</label><select id={`cat-${l.id}`} value={l.category ?? ""} disabled={pending} onChange={(e) => start(async () => { await setLinkMeta(l.id, { category: e.target.value || null }); router.refresh(); })} className="min-h-11 rounded-[var(--radius)] border border-line bg-bg px-2 text-sm"><option value="">No category</option>{VAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></>}
                        {canAdd && <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove “${l.title}” from the Vault?`)) start(async () => { await deleteVaultLink(l.id); router.refresh(); }); }} className="min-h-11 rounded-[var(--radius)] border border-line px-3 text-sm text-muted hover:border-danger hover:text-danger">Remove</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {canAdd ? (
        <form className="grid min-w-0 content-start gap-3 self-start rounded-[var(--radius)] border border-line bg-surface p-5" onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget, f = new FormData(form);
          start(async () => {
            try { await addVaultLink(team.id, { url: String(f.get("url")), title: String(f.get("title")), note: String(f.get("note")) }); form.reset(); setMsg("Added to the Vault."); router.refresh(); }
            catch (x) { setMsg(x instanceof Error ? x.message : "Couldn't add it."); }
          });
        }}>
          <h3 className="font-display text-lg font-semibold">Add a link</h3>
          <label className="grid gap-1"><span className="text-sm font-medium">Link</span><input name="url" required inputMode="url" placeholder="https://drive.google.com/…" className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">Name</span><input name="title" maxLength={120} placeholder="Lab files (shared folder)" className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">Note <span className="font-normal text-muted">(optional)</span></span><input name="note" maxLength={300} placeholder="Upload your graphs here" className={field} /></label>
          <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">{pending ? "Adding…" : "Add to the Vault"}</button>
          <p role="status" className="text-sm text-muted">{msg}</p>
        </form>
      ) : <p className="self-start rounded-[var(--radius)] border border-line bg-surface p-5 text-sm text-muted">Adding links is switched off for you. Ask the team&apos;s admin.</p>}
    </div>
  );
}
