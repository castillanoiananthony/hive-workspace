"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { HexBadge } from "@/components/app/HexBadge";
import { shrinkImage } from "@/lib/shrink-image";
import { signOut } from "../actions";
import { removeProfileImage, updateProfile, uploadProfileImage } from "./actions";

type Props = { name: string; email: string; bio: string; avatar: string | null; banner: string | null; since: string; stats: { goals: number; done: number; teams: number } };

export function ProfileView(p: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  function upload(kind: "avatar" | "banner", file: File | undefined) {
    if (!file) return;
    setMsg(kind === "avatar" ? "Uploading your picture…" : "Uploading your banner…");
    start(async () => {
      try {
        const form = new FormData();
        form.set("kind", kind);
        form.set("file", await shrinkImage(file, kind === "avatar" ? 800 : 2400));
        await uploadProfileImage(form);
        setMsg(kind === "avatar" ? "Profile picture updated." : "Banner updated.");
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Upload failed. Try another picture.");
      }
    });
  }
  const remove = (kind: "avatar" | "banner") => start(async () => { await removeProfileImage(kind); setMsg(kind === "avatar" ? "Profile picture removed." : "Banner removed."); router.refresh(); });

  const btn = "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge disabled:opacity-60";
  return (
    <>
      <h1 className="sr-only">Your profile</h1>
      <section aria-label="Banner and picture" className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
        <div className="relative h-36 bg-raised sm:h-52">
          {p.banner
            // eslint-disable-next-line @next/next/no-img-element -- private, already-resized image from our own route
            ? <img src={p.banner} alt="" className="size-full object-cover" />
            : <div aria-hidden className="honeycomb absolute inset-0 opacity-[0.12]" />}
          <div className="absolute right-3 bottom-3 flex gap-2">
            <button type="button" disabled={pending} onClick={() => bannerInput.current?.click()} className="min-h-11 rounded-[var(--radius)] bg-bg/80 px-3 text-sm font-medium backdrop-blur hover:bg-bg">
              {p.banner ? "Change banner" : "Add a banner"}
            </button>
            {p.banner && <button type="button" disabled={pending} onClick={() => remove("banner")} className="min-h-11 rounded-[var(--radius)] bg-bg/80 px-3 text-sm backdrop-blur hover:bg-bg">Remove</button>}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-5 pb-6 sm:px-8">
          <div className="relative -mt-14 sm:-mt-16">
            {p.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.avatar} alt="Your profile picture" width={128} height={128} className="size-28 rounded-full border-4 border-surface bg-raised object-cover sm:size-32" />
              : <span className="grid size-28 place-items-center rounded-full border-4 border-surface bg-raised sm:size-32"><HexBadge label={p.name || p.email} color="#F5B80B" size={72} /></span>}
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <p className="font-display text-2xl font-semibold sm:text-3xl">{p.name || "Add your name"}</p>
            <p className="text-sm text-muted">{p.email}. Member since {p.since}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => avatarInput.current?.click()} className={btn}>{p.avatar ? "Change picture" : "Add a picture"}</button>
            {p.avatar && <button type="button" disabled={pending} onClick={() => remove("avatar")} className="min-h-11 px-2 text-sm text-muted hover:text-danger">Remove picture</button>}
            {!editing && <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">Edit profile</button>}
          </div>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" className="sr-only" aria-label="Choose a profile picture" onChange={(e) => { upload("avatar", e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={bannerInput} type="file" accept="image/*" className="sr-only" aria-label="Choose a banner" onChange={(e) => { upload("banner", e.target.files?.[0]); e.target.value = ""; }} />
      </section>
      <p role="status" className="mt-3 min-h-6 text-sm text-muted">{msg}</p>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="about-h" className="rounded-[var(--radius)] border border-line bg-surface p-5 sm:p-6">
          <h2 id="about-h" className="font-display text-xl font-semibold">About you</h2>
          {editing ? (
            <form className="mt-4 grid gap-4" onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                try { await updateProfile({ name: String(f.get("name")), bio: String(f.get("bio")) }); setEditing(false); setMsg("Profile saved."); router.refresh(); }
                catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't save."); }
              });
            }}>
              <label className="grid gap-2"><span className="font-medium">Name</span>
                <input name="name" defaultValue={p.name} required maxLength={80} autoComplete="name" className="min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge" />
              </label>
              <label className="grid gap-2"><span className="font-medium">Description</span>
                <textarea name="bio" defaultValue={p.bio} maxLength={300} rows={4} placeholder="BS Aerospace Engineering student. Physics lab group leader." className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-base focus:border-accent-edge" aria-describedby="bio-hint" />
                <span id="bio-hint" className="text-sm text-muted">Up to 300 characters.</span>
              </label>
              <div className="flex gap-2">
                <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">{pending ? "Saving…" : "Save profile"}</button>
                <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-4 text-muted hover:text-ink">Cancel</button>
              </div>
            </form>
          ) : (
            <p className={`mt-3 whitespace-pre-line ${p.bio ? "" : "text-muted"}`}>{p.bio || "No description yet. Click “Edit profile” to say a little about yourself."}</p>
          )}
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
            <div><dt className="text-sm text-muted">Goals</dt><dd className="font-display text-2xl font-semibold">{p.stats.goals}</dd></div>
            <div><dt className="text-sm text-muted">Tasks done</dt><dd className="font-display text-2xl font-semibold">{p.stats.done}</dd></div>
            <div><dt className="text-sm text-muted">Teams</dt><dd className="font-display text-2xl font-semibold">{p.stats.teams}</dd></div>
          </dl>
        </section>

        <nav aria-label="Account" className="self-start rounded-[var(--radius)] border border-line bg-surface p-2">
          {[["/settings", "Settings", "Theme, text size, calendar link"], ["/tutorial", "Tutorial", "Learn every feature step by step"], ["/developer", "Meet the developer", "Who made HIVE-WORKSPACE"]].map(([href, label, hint]) => (
            <Link key={href} href={href} className="flex min-h-14 flex-col justify-center rounded-[var(--radius)] px-3 py-2 hover:bg-raised">
              <span className="font-medium">{label}</span><span className="text-sm text-muted">{hint}</span>
            </Link>
          ))}
          <form action={signOut}><button className="flex min-h-14 w-full items-center rounded-[var(--radius)] px-3 text-left font-medium text-danger hover:bg-raised">Sign out</button></form>
        </nav>
      </div>
    </>
  );
}
