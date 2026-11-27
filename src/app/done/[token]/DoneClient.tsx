"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bee } from "@/components/brand/Bee";
import { markDone, undoDone } from "./actions";

type Result = Awaited<ReturnType<typeof markDone>>;

// Marking happens from the browser after the page loads, so email link scanners (which fetch but rarely run scripts) don't tick tasks by accident.
export function DoneClient({ token }: { token: string }) {
  const [state, setState] = useState<"working" | "done" | "undone" | "missing">("working");
  const [info, setInfo] = useState<NonNullable<Result> | null>(null);
  const [pending, start] = useTransition();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    markDone(token).then((r) => { setInfo(r); setState(r ? "done" : "missing"); });
  }, [token]);

  if (state === "working") return (<><Bee pose="fly" size={96} animate /><p className="mt-4 text-muted" role="status">Marking it as done…</p></>);
  if (state === "missing" || !info)
    return (<><Bee pose="sleep" size={96} /><h1 className="font-display mt-4 text-2xl font-semibold">This link doesn&apos;t work any more</h1><p className="mt-2 text-muted">The task may have been deleted or reassigned. Ask your team owner to check it.</p></>);

  return (
    <>
      <div className="flex justify-center"><Bee pose={state === "done" ? "celebrate" : "idle"} size={112} animate={state === "done"} title={state === "done" ? "Hexley celebrating" : undefined} /></div>
      <h1 className="font-display mt-4 text-2xl font-semibold" role="status">
        {state === "done" ? (info.already ? "Already marked as done ✓" : "Nice! Marked as done ✓") : "Okay, it's not done yet"}
      </h1>
      <p className="mt-2 text-muted">
        <span className="text-ink">{info.title}</span> in {info.team}. {state === "done" ? `Thanks, ${info.member.split(" ")[0]}. Your team can see it on their board.` : "We'll keep reminding you before it's due."}
      </p>
      <div className="mt-6 flex justify-center">
        {state === "done" ? (
          <button type="button" disabled={pending} onClick={() => start(async () => { await undoDone(token); setState("undone"); })} className="min-h-11 rounded-[var(--radius)] border border-line px-5 font-medium hover:border-accent-edge">
            Undo, I&apos;m not done
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await markDone(token); if (r) setInfo(r); setState(r ? "done" : "missing"); })} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">
            Mark done
          </button>
        )}
      </div>
    </>
  );
}
