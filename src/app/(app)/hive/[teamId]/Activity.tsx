"use client";
import { useEffect, useRef, useState } from "react";
import { nameOf, type AssignedT, type LogT, type MemberT, type TaskT } from "./types";

export type DayT = { date: string; label: string; done: number; created: number; posts: number; updates: number };
const C = { todo: "var(--viz-1)", doing: "var(--viz-2)", done: "var(--viz-3)" } as const;
const card = "rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5 sm:p-6";

/** Team activity: where the tasks stand (donut), who has done what (bars), and the last 14 days (lines). */
export function Activity({ tasks, assigned, members, days, logs }: { tasks: TaskT[]; assigned: AssignedT[]; members: MemberT[]; days: DayT[]; logs: LogT[] }) {
  const status = (["todo", "doing", "done"] as const).map((k) => ({ k, n: tasks.filter((t) => t.status === k).length }));
  const people = members.map((m) => {
    const mine = assigned.filter((a) => a.memberId === m.id);
    const pct = mine.length ? Math.round(mine.reduce((s, a) => s + (a.doneAt ? 100 : a.progress), 0) / mine.length) : 0;
    return { m, done: mine.filter((a) => a.doneAt).length, open: mine.filter((a) => !a.doneAt).length, pct, updates: logs.filter((l) => l.memberId === m.id).length };
  }).filter((p) => p.done + p.open > 0).sort((a, b) => b.pct - a.pct || b.updates - a.updates);
  const totalParts = people.reduce((s, p) => s + p.done + p.open, 0), doneParts = people.reduce((s, p) => s + p.done, 0);
  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Tasks", tasks.length], ["Done", status[2].n], ["Parts finished", `${doneParts}/${totalParts}`], ["Updates in 14 days", days.reduce((s, d) => s + d.updates, 0)]].map(([k, v]) => (
          <div key={k} className="rounded-[calc(var(--radius)*2)] border border-line bg-surface px-4 py-3"><dt className="text-sm text-muted">{k}</dt><dd className="font-display text-3xl font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="pie-h" className={card}>
          <h2 id="pie-h" className="font-display text-lg font-semibold">Where the tasks stand</h2>
          <Donut parts={status.map((s) => ({ label: LABEL[s.k], n: s.n, color: C[s.k] }))} />
        </section>
        <section aria-labelledby="bar-h" className={card}>
          <h2 id="bar-h" className="font-display text-lg font-semibold">Everyone&apos;s progress</h2>
          <p className="text-sm text-muted">Average progress on their parts of team tasks, from each person&apos;s slider.</p>
          {people.length ? <Bars rows={people.map((p) => ({ name: nameOf(p.m), pct: p.pct, done: p.done, open: p.open, updates: p.updates }))} /> : <p className="mt-6 text-muted">Assign a team task to see this.</p>}
        </section>
      </div>
      <section aria-labelledby="line-h" className={card}>
        <h2 id="line-h" className="font-display text-lg font-semibold">The last 14 days</h2>
        <Lines days={days} />
      </section>
    </div>
  );
}

const LABEL = { todo: "To do", doing: "In progress", done: "Done" } as const;

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {items.map((i) => <li key={i.label} className="flex items-center gap-2"><span aria-hidden className="size-3 rounded-[3px]" style={{ background: i.color }} />{i.label}</li>)}
    </ul>
  );
}

function Donut({ parts }: { parts: { label: string; n: number; color: string }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = parts.reduce((s, p) => s + p.n, 0);
  const R = 70, W = 22, CIRC = 2 * Math.PI * R, GAP = total > 0 && parts.filter((p) => p.n).length > 1 ? 3 : 0;
  let at = 0;
  const done = parts[2]?.n ?? 0;
  return (
    <div className="mt-4 grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
      <svg viewBox="0 0 180 180" className="mx-auto w-44" role="img" aria-label={parts.map((p) => `${p.label}: ${p.n}`).join(", ")}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--surface-raised)" strokeWidth={W} />
        {total > 0 && parts.map((p, i) => {
          const len = (p.n / total) * CIRC, seg = Math.max(0, len - GAP), off = at; at += len;
          return p.n ? (
            <circle key={p.label} cx="90" cy="90" r={R} fill="none" stroke={p.color} strokeWidth={hover === i ? W + 6 : W}
              strokeDasharray={`${seg} ${CIRC - seg}`} strokeDashoffset={-off} transform="rotate(-90 90 90)" className="transition-[stroke-width] duration-150"
              onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
          ) : null;
        })}
        <text x="90" y="86" textAnchor="middle" className="fill-ink font-display text-[28px] font-semibold">{hover !== null ? parts[hover].n : total ? `${Math.round((done / total) * 100)}%` : "0"}</text>
        <text x="90" y="108" textAnchor="middle" className="fill-muted text-[12px]">{hover !== null ? parts[hover].label : "done"}</text>
      </svg>
      <ul className="grid gap-2">
        {parts.map((p, i) => (
          <li key={p.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="flex items-center justify-between gap-3 rounded-[var(--radius)] px-2 py-1 hover:bg-raised">
            <span className="flex items-center gap-2 whitespace-nowrap"><span aria-hidden className="size-3 rounded-[3px]" style={{ background: p.color }} />{p.label}</span>
            <span className="tabular-nums whitespace-nowrap text-muted">{p.n}{total ? ` (${Math.round((p.n / total) * 100)}%)` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bars({ rows }: { rows: { name: string; pct: number; done: number; open: number; updates: number }[] }) {
  return (
    <ul className="mt-4 grid gap-4">
      {rows.slice(0, 15).map((r) => (
        <li key={r.name} className="grid gap-1">
          <div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{r.name}</span><span className="shrink-0 font-semibold tabular-nums">{r.pct}%</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-raised" title={`${r.name}: ${r.pct}%`}>
            <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct === 100 ? C.done : "var(--viz-4)" }} />
          </div>
          <p className="text-sm text-muted tabular-nums">{r.done} done, {r.open} open, {r.updates} {r.updates === 1 ? "update" : "updates"}</p>
        </li>
      ))}
    </ul>
  );
}

function Lines({ days }: { days: DayT[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = [{ key: "done", label: "Parts marked done", color: C.done }, { key: "created", label: "Tasks created", color: C.todo }, { key: "posts", label: "Comb posts", color: C.doing }, { key: "updates", label: "Progress updates", color: "var(--viz-4)" }] as const;
  // the chart is drawn at its real width so the axis text stays readable on phones
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(280, Math.round(el.clientWidth))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = 220, L = 32, R = 12, T = 12, B = 28;
  const every = Math.max(1, Math.ceil((days.length * 56) / W)); // room for about one label per 56px
  const max = Math.max(4, ...days.flatMap((d) => [d.done, d.created, d.posts, d.updates]));
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, days.length - 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, Math.round(max / 2), max];
  return (
    <div className="mt-3 grid gap-3">
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div ref={box} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label="Daily activity for the last 14 days; the table below has the numbers" onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (<g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t ? "3 4" : undefined} /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">{t}</text></g>))}
          {days.map((d, i) => ((days.length - 1 - i) % every === 0) && <text key={d.date} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} className="fill-muted text-[11px]">{d.label}</text>)}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--text-muted)" strokeWidth="1" />}
          {series.map((s) => (
            <g key={s.key}>
              <polyline fill="none" stroke="var(--surface)" strokeWidth="5" strokeLinejoin="round" points={days.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")} />
              <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={days.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")} />
              {hover !== null && <circle cx={x(hover)} cy={y(days[hover][s.key])} r="5" fill={s.color} stroke="var(--surface)" strokeWidth="2" />}
            </g>
          ))}
          {days.map((d, i) => <rect key={d.date} x={x(i) - (W - L - R) / days.length / 2} y={T} width={(W - L - R) / days.length} height={H - T - B} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />)}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-2 rounded-[var(--radius)] border border-line bg-raised px-3 py-2 text-sm whitespace-nowrap shadow-xl" style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 90px), calc(100% - 200px))` }}>
            <p className="font-semibold">{days[hover].label}</p>
            {series.map((s) => <p key={s.key} className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label}: <span className="tabular-nums">{days[hover][s.key]}</span></p>)}
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius)] border border-line px-3 text-muted hover:border-accent-edge hover:text-ink">Show as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead><tr className="text-muted"><th className="py-1 pr-3 font-medium">Day</th>{series.map((s) => <th key={s.key} className="py-1 pr-3 font-medium">{s.label}</th>)}</tr></thead>
            <tbody>{days.map((d) => <tr key={d.date} className="border-t border-line"><td className="py-1 pr-3">{d.label}</td><td className="py-1 pr-3">{d.done}</td><td className="py-1 pr-3">{d.created}</td><td className="py-1 pr-3">{d.posts}</td><td className="py-1 pr-3">{d.updates}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
