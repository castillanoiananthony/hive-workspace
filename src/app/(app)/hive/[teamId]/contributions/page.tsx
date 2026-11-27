import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/app/BackButton";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { db } from "@/db";
import { teamMember } from "@/db/schema";
import { contributionRows } from "@/lib/contribution-rows";
import { KIND_LABEL } from "@/lib/csv";
import { requireUser } from "@/lib/session";
import { teamAccess } from "@/lib/teams";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Contribution log" };

export default function ContributionsPage({ params, searchParams }: PageProps<"/hive/[teamId]/contributions">) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <Suspense fallback={<HoneyLoader label="Loading the contribution log…" />}><Log params={params} searchParams={searchParams} /></Suspense>
    </main>
  );
}

/** Printable contribution log (browser Print → Save as PDF). Members and advisers only. */
async function Log({ params, searchParams }: { params: PageProps<"/hive/[teamId]/contributions">["params"]; searchParams: PageProps<"/hive/[teamId]/contributions">["searchParams"] }) {
  const { teamId } = await params;
  const me = await requireUser();
  const access = await teamAccess(me.id, teamId).catch(() => null);
  if (!access || access.me.access === "guest") notFound();
  const raw = (await searchParams).member;
  const memberId = (Array.isArray(raw) ? raw[0] : raw) || null;
  const members = await db.select({ id: teamMember.id, name: teamMember.name, nickname: teamMember.nickname }).from(teamMember).where(eq(teamMember.teamId, teamId)).orderBy(asc(teamMember.name));
  const who = memberId ? members.find((m) => m.id === memberId) : null;
  const rows = await contributionRows(teamId, who ? who.id : null);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en", { timeZone: me.timezone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  const totals = new Map<string, number>();
  for (const r of rows) if (r.kind !== "progress") totals.set(r.member, (totals.get(r.member) ?? 0) + 1);
  const csv = `/api/teams/${teamId}/contributions${who ? `?member=${who.id}` : ""}`;
  return (
    <>
      <div className="print:hidden">
        <BackButton fallback={`/hive/${teamId}`} label={`Back to ${access.team.name}`} />
        <form className="mt-2 flex flex-wrap items-end gap-3" action="">
          <label className="grid gap-1"><span className="text-sm font-medium">Show</span>
            <select name="member" defaultValue={who?.id ?? ""} className="min-h-11 rounded-[var(--radius)] border border-line bg-bg px-3">
              <option value="">Everyone</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.nickname?.trim() || m.name}</option>)}
            </select>
          </label>
          <button className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">Apply</button>
          <span className="flex-1" />
          <a href={csv} className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">Download CSV</a>
          <PrintButton />
        </form>
      </div>
      <article className="print-area mt-8">
        <h1 className="font-display text-3xl font-semibold">Contribution log</h1>
        <p className="mt-1 text-muted">{access.team.name}{who ? `, ${who.nickname?.trim() || who.name}` : ", everyone"}. {rows.length} {rows.length === 1 ? "entry" : "entries"}, printed {fmt(new Date())}.</p>
        {totals.size > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {[...totals].sort((a, b) => b[1] - a[1]).map(([n, c]) => <li key={n} className="rounded-full border border-line px-3 py-1">{n}: {c} {c === 1 ? "completion" : "completions"}</li>)}
          </ul>
        )}
        {rows.length === 0 ? <p className="mt-6 text-muted">Nothing recorded yet. Finishing parts, subtasks and approvals will show up here.</p> : (
          <table className="mt-6 w-full border-collapse text-left text-sm">
            <thead><tr className="border-b border-line text-muted"><th className="py-2 pr-3 font-medium">When</th><th className="py-2 pr-3 font-medium">Who</th><th className="py-2 pr-3 font-medium">What</th><th className="py-2 font-medium">Task</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.at)}</td>
                  <td className="py-2 pr-3">{r.member}</td>
                  <td className="py-2 pr-3">{KIND_LABEL[r.kind] ?? r.kind}{r.detail && <span className="block text-muted">{r.detail}</span>}</td>
                  <td className="py-2">{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </>
  );
}
