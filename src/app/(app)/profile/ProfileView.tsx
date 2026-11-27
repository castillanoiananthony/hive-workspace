"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { HexBadge } from "@/components/app/HexBadge";
import { Modal } from "@/components/app/Modal";
import { SignOutButton } from "@/components/app/SignOutButton";
import { shrinkImage } from "@/lib/shrink-image";
import { removeProfileImage, updateProfile, uploadProfileImage } from "./actions";
import { ImageAdjuster } from "./ImageAdjuster";

type Props = { name: string; email: string; bio: string; avatar: string | null; banner: string | null; since: string; stats: { goals: number; done: number; teams: number; followers: number; following: number } };

export function ProfileView(p: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  // a chosen file (or the current picture) opens the adjuster first; Save there uploads the cropped result
  const [adjust, setAdjust] = useState<{ kind: "avatar" | "banner"; src: string } | null>(null);
  const pick = (kind: "avatar" | "banner", file: File | undefined) => { if (file) setAdjust({ kind, src: URL.createObjectURL(file) }); };

  function upload(kind: "avatar" | "banner", file: File | undefined) {
    if (!file) return;
    setMsg(kind === "avatar" ? "Uploading your picture…" : "Uploading your banner…");
    start(async () => {
      try {
        const form = new FormData();
        form.set("kind", kind);
        form.set("file", await shrinkImage(file, kind === "avatar" ? 800 : 1600));
        await uploadProfileImage(form);
        setMsg(kind === "avatar" ? "Profile picture updated." : "Banner updated.");
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Upload failed. Try another picture.");
      }
    });
  }
  
  const [menu, setMenu] = useState<"avatar" | "banner" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRun = (label: string, fn: () => Promise<void>) => { setBusy(label); start(async () => { try { await fn(); } finally { setBusy(null); } }); };
  const outline = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
  const iconBtn = "grid size-11 place-items-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur hover:border-accent-edge hover:text-accent";
  const which = menu === "avatar" ? { has: Boolean(p.avatar), src: p.avatar, noun: "profile picture" } : { has: Boolean(p.banner), src: p.banner, noun: "banner" };
  return (
    <>
      <h1 className="sr-only">Your profile</h1>
      <BusyOverlay show={Boolean(busy) || (pending && Boolean(msg?.endsWith("…")))} label={busy ?? msg ?? "Working…"} />
      <section aria-label="Banner and picture" className="overflow-hidden rounded-[calc(var(--radius)*2)] border border-line bg-surface shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
        <div className="relative h-36 bg-raised sm:h-56">
          {p.banner
            // eslint-disable-next-line @next/next/no-img-element -- private, already-resized image from our own route
            ? <img src={p.banner} alt="" className="size-full object-cover" />
            : <div aria-hidden className="honeycomb absolute inset-0 opacity-[0.12]" />}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface/80 to-transparent" />
          <button type="button" disabled={pending} onClick={() => setMenu("banner")} aria-label={p.banner ? "Edit banner" : "Add a banner"} className={`absolute top-3 right-3 ${iconBtn}`}><EditImageIcon /></button>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-5 pb-6 sm:px-8">
          <div className="relative -mt-14 sm:-mt-16">
            {p.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.avatar} alt="Your profile picture" width={128} height={128} className="size-28 rounded-full border-4 border-accent bg-raised object-cover shadow-xl sm:size-32" />
              : <span className="grid size-28 place-items-center rounded-full border-4 border-accent bg-raised sm:size-32"><HexBadge label={p.name || p.email} color="#F5B80B" size={72} /></span>}
            <button type="button" disabled={pending} onClick={() => setMenu("avatar")} aria-label={p.avatar ? "Edit profile picture" : "Add a profile picture"} className={`absolute -right-1 bottom-1 ${iconBtn}`}><EditImageIcon /></button>
          </div>
          <div className="min-w-0 basis-full sm:basis-0 sm:flex-1 sm:pb-1">
            <p className="font-display text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">{p.name || "Add your name"}</p>
            <p className="text-sm text-muted [overflow-wrap:anywhere]">{p.email}. Member since {p.since}.</p>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent shadow-[0_8px_24px_-10px_var(--accent)] hover:bg-accent-hover">
            <PencilIcon />Edit profile
          </button>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" className="sr-only" aria-label="Choose a profile picture" onChange={(e) => { pick("avatar", e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={bannerInput} type="file" accept="image/*" className="sr-only" aria-label="Choose a banner" onChange={(e) => { pick("banner", e.target.files?.[0]); e.target.value = ""; }} />
      </section>
      <p role="status" className="mt-3 min-h-6 text-sm text-muted">{busy ? "" : msg}</p>

      <Modal open={menu !== null} onClose={() => setMenu(null)} title={menu === "avatar" ? "Profile picture" : "Banner"}>
        <div className="grid gap-3">
          <button type="button" onClick={() => { const k = menu; setMenu(null); (k === "avatar" ? avatarInput : bannerInput).current?.click(); }} className={outline}><UploadIcon />{which.has ? `Upload a new ${which.noun}` : `Upload a ${which.noun}`}</button>
          {which.has && <button type="button" onClick={() => { const k = menu!; setMenu(null); setAdjust({ kind: k, src: which.src! }); }} className={outline}><CropIcon />Adjust position and zoom</button>}
          {which.has && <button type="button" onClick={() => { const k = menu!; setMenu(null); busyRun(k === "avatar" ? "Removing your picture…" : "Removing your banner…", async () => { await removeProfileImage(k); setMsg(k === "avatar" ? "Profile picture removed." : "Banner removed."); router.refresh(); }); }} className={`${outline} text-danger hover:border-danger`}><TrashIcon />Remove {which.noun}</button>}
        </div>
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit profile">
        <form className="grid gap-4" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setEditing(false);
          busyRun("Saving your profile…", async () => {
            try { await updateProfile({ name: String(f.get("name")), bio: String(f.get("bio")) }); setMsg("Profile saved."); router.refresh(); }
            catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't save."); setEditing(true); }
          });
        }}>
          <label className="grid gap-2"><span className="font-medium">Name</span>
            <input name="name" defaultValue={p.name} required maxLength={80} autoComplete="name" className="min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge" />
          </label>
          <label className="grid gap-2"><span className="font-medium">Description</span>
            <textarea name="bio" defaultValue={p.bio} maxLength={300} rows={5} placeholder="BS Aerospace Engineering student. Physics lab group leader." className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-base focus:border-accent-edge" aria-describedby="bio-hint" />
            <span id="bio-hint" className="text-sm text-muted">Up to 300 characters.</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className={outline}>Cancel</button>
            <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">Save profile</button>
          </div>
        </form>
      </Modal>

      {adjust && (
        <ImageAdjuster kind={adjust.kind} src={adjust.src}
          onCancel={() => setAdjust(null)}
          onSave={(file) => { const k = adjust.kind; setAdjust(null); upload(k, file); }} />
      )}

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="about-h" className="rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5 sm:p-6">
          <h2 id="about-h" className="font-display text-xl font-semibold">About you</h2>
          <p className={`mt-3 whitespace-pre-line ${p.bio ? "" : "text-muted"}`}>{p.bio || "No description yet. Tap “Edit profile” to say a little about yourself."}</p>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center sm:grid-cols-5">
            <div><dt className="text-sm text-muted"><Link href="/people" className="hover:underline">Followers</Link></dt><dd className="font-display text-2xl font-semibold">{p.stats.followers}</dd></div>
            <div><dt className="text-sm text-muted"><Link href="/people" className="hover:underline">Following</Link></dt><dd className="font-display text-2xl font-semibold">{p.stats.following}</dd></div>
            <div><dt className="text-sm text-muted">Goals</dt><dd className="font-display text-2xl font-semibold">{p.stats.goals}</dd></div>
            <div><dt className="text-sm text-muted">Tasks done</dt><dd className="font-display text-2xl font-semibold">{p.stats.done}</dd></div>
            <div><dt className="text-sm text-muted">Teams</dt><dd className="font-display text-2xl font-semibold">{p.stats.teams}</dd></div>
          </dl>
        </section>

        <nav aria-label="Account" className="self-start rounded-[calc(var(--radius)*2)] border border-line bg-surface p-2">
          {[["/people", "People", "Search, visit and follow accounts"], ["/settings", "Settings", "Theme, text size, calendar link"], ["/tutorial", "Tutorial", "Learn every feature step by step"], ["/developer", "Meet the developer", "Who made HIVE-WORKSPACE"]].map(([href, label, hint]) => (
            <Link key={href} href={href} className="flex min-h-14 flex-col justify-center rounded-[var(--radius)] px-3 py-2 hover:bg-raised">
              <span className="font-medium">{label}</span><span className="text-sm text-muted">{hint}</span>
            </Link>
          ))}
          <div className="p-1"><SignOutButton className="flex min-h-12 w-full items-center justify-center rounded-[var(--radius)] border border-line px-3 font-medium text-danger hover:border-danger disabled:opacity-60" /></div>
        </nav>
      </div>
    </>
  );
}

const Svg = ({ children }: { children: React.ReactNode }) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
/** a picture frame with a pencil on it: "edit this image" */
const EditImageIcon = () => <Svg><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M3 13l4-4 4 4" /><circle cx="12.5" cy="8" r="1.2" /><path d="M14 20l1-3.5 5.5-5.5 2.5 2.5-5.5 5.5z" /></Svg>;
const PencilIcon = () => <Svg><path d="M4 20l1.2-4.4L16 4.8l3.2 3.2L8.4 18.8z" /><path d="M13.5 7.3l3.2 3.2" /></Svg>;
const UploadIcon = () => <Svg><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></Svg>;
const CropIcon = () => <Svg><path d="M6 2v14a2 2 0 002 2h14" /><path d="M2 6h14a2 2 0 012 2v14" /></Svg>;
const TrashIcon = () => <Svg><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
