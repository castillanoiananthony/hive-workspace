import type { Metadata } from "next";
import { and, asc, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { contribution, hiveMilestone, task, teamChecklist, teamChecklistItem, teamMember, testField, testRun } from "@/db/schema";
import { formatDue } from "@/lib/dates";
import { gitLink } from "@/lib/git-link";
import { requireUser } from "@/lib/session";
import { teamAccess } from "@/lib/teams";
import { PrintButton } from "../contributions/PrintButton";

export const metadata: Metadata = { title: "Project summary" };

export default function SummaryPage({ params }: PageProps<"/hive/[teamId]/summary">) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<HoneyLoader label="Putting the summary together…" />}><Summary params={params} /></Suspense>
    </main>
  );
}

const KIND = { hackathon: "Hackathon", competition: "Coding competition", project: "Software project", blank: "Team project" } as const;

/** A one-page record of the project for portfolios and resumes: milestones hit, who did what, and how it ended. */
async function Summary({ params }: { params: PageProps<"/hive/[teamId]/summary">["params"] }) {
  const { teamId } = await params;
  const me = await requireUser();
  const a = await teamAccess(me.id, teamId).catch(() => null);
  if (!a || a.me.access === "guest") notFound();
  const t = a.team;
  const [members, milestones, tasks, contribs, lists, items, fields, runs] = await Promise.all([
    db.select().from(teamMember).where(and(eq(teamMember.teamId, teamId), ne(teamMember.access, "guest"))).orderBy(asc(teamMember.name)),
    db.select().from(hiveMilestone).where(eq(hiveMilestone.teamId, teamId)).orderBy(asc(hiveMilestone.dueAt), asc(hiveMilestone.position)),
    db.select({ status: task.status, type: task.type, title: task.title, decision: task.decision, rationale: task.rationale }).from(task).where(eq(task.teamId, teamId)),
    db.select().from(contribution).where(eq(contribution.teamId, teamId)),
    db.select().from(teamChecklist).where(eq(teamChecklist.teamId, teamId)).orderBy(asc(teamChecklist.position)),
    db.select({ i: teamChecklistItem }).from(teamChecklistItem).innerJoin(teamChecklist, eq(teamChecklistItem.checklistId, teamChecklist.id)).where(eq(teamChecklist.teamId, teamId)),
    db.select().from(testField).where(eq(testField.teamId, teamId)).orderBy(asc(testField.position)),
    db.select().from(testRun).where(eq(testRun.teamId, teamId)).orderBy(asc(testRun.ranAt)),
  ]);
  const fmt = (d: Date, time = false) => formatDue(d, time, me.timezone);
  const name = (m: typeof members[number]) => m.nickname?.trim() || m.name;
  const people = members.filter((m) => m.access === "member").map((m) => {
    const mine = contribs.filter((c) => c.memberId === m.id);
    return { m, parts: mine.filter((c) => c.kind === "part_done").length, subs: mine.filter((c) => c.kind === "subtask_done").length, approved: mine.filter((c) => c.kind === "approved").length };
  });
  const advisers = members.filter((m) => m.access === "adviser");
  const hit = milestones.filter((m) => m.doneAt);
  const done = tasks.filter((x) => x.status === "done").length;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackButton fallback={`/hive/${teamId}`} label={`Back to ${t.name}`} className="" />
        <PrintButton />
      </div>
      <article className="print-area mt-8 grid gap-8">
        <header>
          <p className="text-sm text-muted">{KIND[t.kind]} summary</p>
          <h1 className="font-display text-4xl font-semibold">{t.name}</h1>
          <p className="mt-1 text-muted">Started {fmt(t.createdAt)}{t.archivedAt ? `, finished ${fmt(t.archivedAt)}` : ""}. {members.filter((m) => m.access === "member").length} team members{advisers.length ? `, advised by ${advisers.map(name).join(", ")}` : ""}.</p>
        </header>
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[["Milestones hit", `${hit.length}/${milestones.length}`], ["Tasks done", `${done}/${tasks.length}`], ["Contributions", contribs.filter((c) => c.kind !== "sent_for_review").length]].map(([k, v]) => (
            <div key={k} className="rounded-[var(--radius)] border border-line p-3"><dt className="text-sm text-muted">{k}</dt><dd className="font-display text-2xl font-semibold tabular-nums">{v}</dd></div>
          ))}
        </dl>
        {milestones.length > 0 && (
          <section aria-labelledby="sm-ms">
            <h2 id="sm-ms" className="font-display text-xl font-semibold">Milestones</h2>
            <ol className="mt-3 grid gap-1">
              {milestones.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-x-4 border-b border-line py-2">
                  <span className="font-medium">{m.doneAt ? "✓ " : "○ "}{m.title}</span>
                  <span className="text-sm text-muted">{m.doneAt ? `Reached ${fmt(m.doneAt, true)}` : "Not reached"}{m.dueAt ? `, due ${fmt(m.dueAt, m.hasTime)}` : ""}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <section aria-labelledby="sm-team">
          <h2 id="sm-team" className="font-display text-xl font-semibold">Who did what</h2>
          <table className="mt-3 w-full border-collapse text-left text-sm">
            <thead><tr className="border-b border-line text-muted"><th className="py-2 pr-3 font-medium">Member</th><th className="py-2 pr-3 font-medium">Parts finished</th><th className="py-2 pr-3 font-medium">Subtasks finished</th><th className="py-2 font-medium">Work approved</th></tr></thead>
            <tbody>{people.map((p) => <tr key={p.m.id} className="border-b border-line"><td className="py-2 pr-3 font-medium">{name(p.m)}{p.m.isAdmin ? " (leader)" : ""}</td><td className="py-2 pr-3 tabular-nums">{p.parts}</td><td className="py-2 pr-3 tabular-nums">{p.subs}</td><td className="py-2 tabular-nums">{p.approved}</td></tr>)}</tbody>
          </table>
        </section>
        {runs.length > 0 && (() => {
          const best = runs.find((r) => r.isBest);
          const top = fields.map((f) => { const vs = runs.map((r) => r.values[f.id]).filter((v): v is number => typeof v === "number"); return vs.length ? { f, first: vs[0], best: f.higherIsBetter ? Math.max(...vs) : Math.min(...vs) } : null; }).filter((x): x is NonNullable<typeof x> => Boolean(x));
          const graded = runs.filter((r) => r.result);
          return (
            <section aria-labelledby="sm-tests">
              <h2 id="sm-tests" className="font-display text-xl font-semibold">Results</h2>
              <p className="mt-1 text-muted">{runs.length} test runs logged{graded.length ? `, ${Math.round((100 * graded.filter((r) => r.result === "pass").length) / graded.length)}% passed` : ""}.{best ? ` Best version: ${(best.version && gitLink(best.version)?.label) ?? best.version ?? fmt(best.ranAt, true)}.` : ""}</p>
              {top.length > 0 && <ul className="mt-3 grid gap-1">{top.map(({ f, first, best: b }) => <li key={f.id} className="flex justify-between border-b border-line py-2"><span className="font-medium">{f.name}</span><span className="tabular-nums text-muted">first {first}{f.unit ?? ""} → best {b}{f.unit ?? ""}</span></li>)}</ul>}
            </section>
          );
        })()}
        {tasks.some((x) => x.type === "decision") && (
          <section aria-labelledby="sm-dec">
            <h2 id="sm-dec" className="font-display text-xl font-semibold">Key decisions</h2>
            <ul className="mt-3 grid gap-3">{tasks.filter((x) => x.type === "decision").map((x, i) => <li key={i}><p className="font-medium">{x.decision || x.title}</p>{x.rationale && <p className="text-sm text-muted">{x.rationale}</p>}</li>)}</ul>
          </section>
        )}
        {lists.length > 0 && (
          <section aria-labelledby="sm-cl">
            <h2 id="sm-cl" className="font-display text-xl font-semibold">Checklists</h2>
            <ul className="mt-3 grid gap-1">{lists.map((l) => { const xs = items.filter((x) => x.i.checklistId === l.id); return <li key={l.id} className="flex justify-between border-b border-line py-2"><span className="font-medium">{l.title}</span><span className="text-sm text-muted">{xs.filter((x) => x.i.doneAt).length} of {xs.length} done</span></li>; })}</ul>
          </section>
        )}
        <p className="text-sm text-muted">Made with HIVE-WORKSPACE, hive-workspace.com</p>
      </article>
    </>
  );
}
