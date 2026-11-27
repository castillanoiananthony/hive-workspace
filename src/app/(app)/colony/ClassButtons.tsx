"use client";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { BusyOverlay } from "@/components/app/BusyOverlay";
import { Modal } from "@/components/app/Modal";
import { createColony, joinColony } from "./actions";

const field = "min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";

/** "Create a class" (you become its Queen Bee) and "Join a class" (with the teacher's 6-character code). */
export function ClassButtons() {
  const [open, setOpen] = useState<"create" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = (fn: () => Promise<void>) => { setErr(null); setOpen(null); start(async () => { try { await fn(); } catch (e) { unstable_rethrow(e); setErr(e instanceof Error ? e.message : "Something went wrong."); } }); };
  return (
    <>
      <BusyOverlay show={pending} label="Opening the class…" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen("join")} className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">Join a class</button>
        <button type="button" onClick={() => setOpen("create")} className="min-h-11 rounded-[var(--radius)] border border-accent-edge/70 px-4 font-medium text-accent-text hover:bg-accent/10">Create a class</button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
      <Modal open={open === "join"} onClose={() => setOpen(null)} title="Join a class">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); const code = String(new FormData(e.currentTarget).get("code")); submit(() => joinColony(code)); }}>
          <label className="grid gap-2"><span className="font-medium">Class code</span>
            <input name="code" required autoFocus maxLength={16} autoComplete="off" autoCapitalize="characters" placeholder="e.g. K7Q2MP" className={`${field} font-mono text-xl tracking-[0.3em] uppercase`} />
            <span className="text-sm text-muted">Your teacher gives you a 6-character code.</span>
          </label>
          <button className="min-h-12 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">Join class</button>
        </form>
      </Modal>
      <Modal open={open === "create"} onClose={() => setOpen(null)} title="Create a class">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name")); submit(() => createColony(name)); }}>
          <p className="text-muted">You become the class&apos;s <strong className="text-ink">Queen Bee</strong>. Students join with a code, you group them into swarms, give every swarm the same project and follow their progress. You only ever see class work, never a student&apos;s own My Cell.</p>
          <label className="grid gap-2"><span className="font-medium">Class name</span>
            <input name="name" required autoFocus maxLength={80} placeholder="ASE 111, Section B" className={field} />
          </label>
          <button className="min-h-12 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">Create class</button>
        </form>
      </Modal>
    </>
  );
}
