"use client";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { joinTeam } from "../../hive/actions";

export function JoinButton({ code, team }: { code: string; team: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" disabled={pending} onClick={() => start(async () => { try { await joinTeam(code); } catch (e) { unstable_rethrow(e); setErr(e instanceof Error ? e.message : "Couldn't join."); } })}
        className="min-h-12 rounded-[var(--radius)] bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">{pending ? "Joining…" : `Join ${team}`}</button>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
    </>
  );
}
