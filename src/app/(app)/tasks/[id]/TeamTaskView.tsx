"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BackButton } from "@/components/app/BackButton";
import { markMyPart } from "../../hive/actions";
import { moveTeamTask } from "../../hive/work-actions";
import { TaskExtras, type Extras } from "./TaskExtras";
import { TypeTag } from "@/components/app/TypeTag";
import { gitLink } from "@/lib/git-link";

/** A team task for members who can't edit tasks: read the steps and tick your own part. */
export function TeamTaskView(p: { id: string; team: { id: string; name: string }; title: string; howToHtml: string; due: string | null; checklist: string[]; links: { title: string; url: string }[]; assigned: boolean; done: boolean; status: "todo" | "doing" | "review" | "done"; canApprove: boolean; ownsSubtask: boolean; extras: Extras; dev?: { customTypes?: { id: string; label: string; color: string }[]; type: string; severity: string | null; steps: string | null; decision: string | null; rationale: string | null; run: { at: Date; version: string | null; result: string | null } | null } }) {
  const router = useRouter();
  const [done, setDone] = useState(p.done);
  const [pending, start] = useTransition();
  return (
    <article className="max-w-3xl">
      <BackButton fallback={`/hive/${p.team.id}`} label={`Back to ${p.team.name}`} />
      <p className="text-sm text-muted">{p.team.name}</p>
      <h1 className="font-display mt-1 text-3xl font-semibold sm:text-4xl">{p.title || "Untitled task"}</h1>
      {p.due && <p className="mt-2"><span className="font-medium">Due:</span> {p.due}</p>}
      {p.dev?.type && p.dev.type !== "task" && <p className="mt-2"><TypeTag type={p.dev.type} custom={p.dev.customTypes} />{p.dev.severity && <span className="ml-2 text-sm text-muted">Severity: {p.dev.severity}</span>}</p>}
      <StatusRow id={p.id} status={p.status} canMove={p.assigned || p.ownsSubtask || p.canApprove} canApprove={p.canApprove} />
      {p.assigned ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <p className="flex-1">{done ? "Your part is marked done." : "This is assigned to you."}</p>
          <button type="button" disabled={pending} onClick={() => start(async () => { await markMyPart(p.id, !done); setDone(!done); router.refresh(); })}
            className={done ? "min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium" : "min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover"}>
            {done ? "Undo, I'm not done" : "Mark my part done"}
          </button>
        </div>
      ) : <p className="mt-5 text-muted">This isn&apos;t assigned to you.</p>}
      {p.howToHtml && (<section className="mt-8"><h2 className="font-display text-lg font-semibold">How to do it</h2><div className="task-notes mt-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3" dangerouslySetInnerHTML={{ __html: p.howToHtml }} /></section>)}
      {p.checklist.length > 0 && (<section className="mt-8"><h2 className="font-display text-lg font-semibold">Checklist</h2><ul className="mt-2 list-disc pl-6">{p.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul></section>)}
      {p.links.length > 0 && (<section className="mt-8"><h2 className="font-display text-lg font-semibold">Links</h2><ul className="mt-2 grid gap-1">{p.links.map((l, i) => <li key={i}><a href={l.url} target="_blank" rel="noreferrer noopener" className="text-accent-text underline underline-offset-4">{l.title}</a>{gitLink(l.url) && <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold">{gitLink(l.url)!.label}</span>}</li>)}</ul></section>)}
      {p.dev?.type === "bug" && (p.dev.steps || p.dev.run) && (<section className="mt-8"><h2 className="font-display text-lg font-semibold">Steps to reproduce</h2>{p.dev.steps && <p className="mt-2 whitespace-pre-line">{p.dev.steps}</p>}{p.dev.run && <p className="mt-2 text-sm text-muted">Seen in the test run of {new Date(p.dev.run.at).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{p.dev.run.version ? `, ${p.dev.run.version}` : ""}{p.dev.run.result ? ` (${p.dev.run.result})` : ""}</p>}</section>)}
      {p.dev?.type === "decision" && p.dev.decision && (<section className="mt-8 rounded-[var(--radius)] border border-[#8B5CF6]/60 p-4"><h2 className="font-display text-lg font-semibold">We chose</h2><p className="mt-1 font-medium">{p.dev.decision}</p>{p.dev.rationale && <p className="mt-2 whitespace-pre-line text-muted">Why: {p.dev.rationale}</p>}</section>)}
      <TaskExtras {...p.extras} />
    </article>
  );
}

const LABEL = { todo: "To do", doing: "In progress", review: "Needs review", done: "Done" } as const;

/** Where the task stands. People working on it can send it for review; approvers finish it. */
function StatusRow({ id, status, canMove, canApprove }: { id: string; status: keyof typeof LABEL; canMove: boolean; canApprove: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = (s: keyof typeof LABEL) => start(async () => { try { await moveTeamTask(id, s); setMsg(null); router.refresh(); } catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't move it."); } });
  const btn = "min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge disabled:opacity-60";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-line px-3 py-1 text-sm font-medium">Status: {LABEL[status]}</span>
      {canMove && status !== "review" && status !== "done" && <button type="button" disabled={pending} onClick={() => go("review")} className={btn}>Send for review</button>}
      {canApprove && status === "review" && <button type="button" disabled={pending} onClick={() => go("done")} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">Approve, mark Done</button>}
      {canApprove && status === "review" && <button type="button" disabled={pending} onClick={() => go("doing")} className={btn}>Send back</button>}
      {msg && <p role="status" className="basis-full text-sm text-danger">{msg}</p>}
    </div>
  );
}
