"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { gitLink } from "@/lib/git-link";
import { addTestField, deleteTestField, deleteTestRun, logTestRun, setBestRun } from "../test-actions";
import { has, nameOf, type MeT, type MemberT, type TeamT } from "./types";

export type TestFieldT = { id: string; name: string; unit: string | null; higherIsBetter: boolean };
export type TestRunT = { id: string; memberId: string | null; at: string; label: string; version: string | null; result: "pass" | "fail" | null; notes: string | null; values: Record<string, number>; isBest: boolean };

const card = "rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5";
const field = "min-h-11 min-w-0 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent-edge";
const outline = "min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge disabled:opacity-60";

/** A version label: GitHub/GitLab links become "PR #42" / "Commit a1b2c3d"; other links open; plain text stays text. */
export function VersionLabel({ v }: { v: string | null }) {
  if (!v) return <span className="text-muted">–</span>;
  const g = gitLink(v);
  if (g) return <a href={v} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold whitespace-nowrap hover:border-accent-edge">{g.label}<span className="sr-only"> on {g.host} (opens in a new tab)</span></a>;
  if (/^https?:\/\//.test(v)) return <a href={v} target="_blank" rel="noreferrer noopener" className="break-all underline underline-offset-4">{v.replace(/^https?:\/\//, "").slice(0, 40)}</a>;
  return <span className="font-mono text-sm">{v}</span>;
}

/** Test & Results Log: log runs with pass/fail and the hive's own numbers, chart any number, pin the best version. */
export function TestLog({ team, me, members, fields, runs }: { team: TeamT; me: MeT; members: MemberT[]; fields: TestFieldT[]; runs: TestRunT[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [chartField, setChartField] = useState(fields[0]?.id ?? "");
  const manage = has(me, "tasks") && !team.archived, canLog = (me.access ?? "member") === "member" && !team.archived;
  const run = (fn: () => Promise<unknown>, ok?: string) => start(async () => { try { await fn(); setMsg(ok ?? null); router.refresh(); } catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't save."); } });
  const who = (id: string | null) => { const m = members.find((x) => x.id === id); return m ? nameOf(m) : "Former member"; };
  const best = runs.find((r) => r.isBest);
  const f = fields.find((x) => x.id === chartField) ?? fields[0];
  const passRate = runs.filter((r) => r.result).length ? Math.round((100 * runs.filter((r) => r.result === "pass").length) / runs.filter((r) => r.result).length) : null;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}><p className="text-sm text-muted">Runs logged</p><p className="font-display text-3xl font-semibold tabular-nums">{runs.length}</p></div>
        <div className={card}><p className="text-sm text-muted">Pass rate</p><p className="font-display text-3xl font-semibold tabular-nums">{passRate === null ? "–" : `${passRate}%`}</p></div>
        <div className={`${card} ${best ? "border-accent-edge/70" : ""}`}>
          <p className="text-sm text-muted">Best version</p>
          {best ? <><p className="mt-1"><VersionLabel v={best.version} /></p><p className="text-sm text-muted">{fields.filter((x) => best.values[x.id] !== undefined).map((x) => `${x.name} ${best.values[x.id]}${x.unit ?? ""}`).join(", ") || best.label}</p></> : <p className="mt-1 text-sm text-muted">Pin a run with ★ to mark it.</p>}
        </div>
      </div>

      {fields.length > 0 && runs.some((r) => f && r.values[f.id] !== undefined) && (
        <section aria-labelledby="chart-h" className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="chart-h" className="font-display text-lg font-semibold">{f?.name} over time</h2>
            {fields.length > 1 && <><label className="sr-only" htmlFor="chart-field">Number to chart</label><select id="chart-field" value={f?.id} onChange={(e) => setChartField(e.target.value)} className={`${field} min-h-10 text-sm`}>{fields.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></>}
          </div>
          {f && <RunChart field={f} runs={runs} />}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="runs-h" className={`${card} relative overflow-x-auto`}>
          <h2 id="runs-h" className="font-display text-lg font-semibold">Runs</h2>
          {runs.length === 0 ? <p className="mt-2 text-sm text-muted">No runs yet. Log every test, build or attempt so you can see what got better.</p> : (
            <table className="mt-3 w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead><tr className="border-b border-line text-muted"><th className="py-2 pr-2 font-medium"><span className="sr-only">Best</span></th><th className="py-2 pr-3 font-medium">When</th><th className="py-2 pr-3 font-medium">Version</th><th className="py-2 pr-3 font-medium">Result</th>{fields.map((x) => <th key={x.id} className="py-2 pr-3 font-medium">{x.name}{x.unit ? ` (${x.unit})` : ""}</th>)}<th className="py-2 font-medium">Notes</th></tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className={`border-b border-line align-top ${r.isBest ? "bg-accent/5" : ""}`}>
                    <td className="py-2 pr-2">{manage ? <button type="button" aria-pressed={r.isBest} aria-label={r.isBest ? "Unpin best version" : "Pin as best version"} disabled={pending} onClick={() => run(() => setBestRun(r.id, !r.isBest))} className={`grid size-9 place-items-center rounded-full border ${r.isBest ? "border-accent-edge text-accent-text" : "border-line text-muted hover:text-ink"}`}>★</button> : r.isBest ? <span aria-label="Best version" className="text-accent-text">★</span> : null}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.label}<span className="block text-muted">{who(r.memberId)}</span></td>
                    <td className="py-2 pr-3"><VersionLabel v={r.version} /></td>
                    <td className="py-2 pr-3">{r.result ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.result === "pass" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>{r.result === "pass" ? "✓ Pass" : "✕ Fail"}</span> : "–"}</td>
                    {fields.map((x) => <td key={x.id} className="py-2 pr-3 tabular-nums">{r.values[x.id] ?? "–"}</td>)}
                    <td className="py-2">{r.notes && <span className="break-words">{r.notes}</span>}{(r.memberId === me.memberId || manage) && !team.archived && <button type="button" disabled={pending} onClick={() => { if (confirm("Delete this run?")) run(() => deleteTestRun(r.id)); }} className="ml-2 text-xs text-muted underline hover:text-danger">Delete</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="grid content-start gap-6">
          {canLog && (
            <form className={`${card} grid gap-3`} onSubmit={(e) => {
              e.preventDefault(); const fd = new FormData(e.currentTarget), form = e.currentTarget;
              run(async () => { await logTestRun(team.id, { version: String(fd.get("version")), result: String(fd.get("result")), notes: String(fd.get("notes")), values: Object.fromEntries(fields.map((x) => [x.id, String(fd.get(`v-${x.id}`) ?? "")])) }); form.reset(); }, "Run logged.");
            }}>
              <h2 className="font-display text-lg font-semibold">Log a run</h2>
              <label className="grid gap-1"><span className="text-sm font-medium">Version or commit link</span><input name="version" maxLength={300} placeholder="v0.3 or https://github.com/…/commit/…" className={field} /></label>
              <fieldset><legend className="mb-1 text-sm font-medium">Result</legend>
                <div className="flex flex-wrap gap-2">{[["pass", "Pass"], ["fail", "Fail"], ["", "No result"]].map(([v, l]) => <label key={l} className="flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-line px-3 has-[:checked]:border-accent-edge has-[:checked]:bg-raised"><input type="radio" name="result" value={v} defaultChecked={v === ""} className="accent-[var(--accent)]" />{l}</label>)}</div>
              </fieldset>
              {fields.map((x) => <label key={x.id} className="grid gap-1"><span className="text-sm font-medium">{x.name}{x.unit ? ` (${x.unit})` : ""}</span><input name={`v-${x.id}`} inputMode="decimal" className={field} /></label>)}
              <label className="grid gap-1"><span className="text-sm font-medium">Notes</span><textarea name="notes" rows={2} maxLength={1000} placeholder="What changed, what broke" className={`${field} py-2`} /></label>
              <button disabled={pending} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">Log run</button>
            </form>
          )}
          <section aria-labelledby="fields-h" className={card}>
            <h2 id="fields-h" className="font-display text-lg font-semibold">Numbers this hive tracks</h2>
            {fields.length === 0 && <p className="mt-1 text-sm text-muted">None yet. Add what matters for your project: Score, Time (s), Accuracy %, Load time ms…</p>}
            <ul className="mt-2 grid gap-1">{fields.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 text-sm"><span><b>{x.name}</b>{x.unit && ` (${x.unit})`}, {x.higherIsBetter ? "higher is better" : "lower is better"}</span>{manage && <button type="button" disabled={pending} onClick={() => { if (confirm(`Stop tracking ${x.name}?`)) run(() => deleteTestField(x.id)); }} className="text-xs text-muted underline hover:text-danger">Remove</button>}</li>)}</ul>
            {manage && (
              <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget), form = e.currentTarget; run(async () => { await addTestField(team.id, { name: String(fd.get("n")), unit: String(fd.get("u")), higherIsBetter: fd.get("hb") !== "lower" }); form.reset(); }); }}>
                <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                  <label className="sr-only" htmlFor="tf-n">Name</label><input id="tf-n" name="n" required maxLength={40} placeholder="Score" className={field} />
                  <label className="sr-only" htmlFor="tf-u">Unit</label><input id="tf-u" name="u" maxLength={12} placeholder="unit" className={field} />
                </div>
                <label className="sr-only" htmlFor="tf-hb">Which way is better</label>
                <select id="tf-hb" name="hb" className={field}><option value="higher">Higher is better</option><option value="lower">Lower is better</option></select>
                <button disabled={pending} className={outline}>Add number</button>
              </form>
            )}
          </section>
          <p role="status" className="text-sm text-muted">{msg}</p>
        </div>
      </div>
    </div>
  );
}

/** One number over time; the best run (pinned, or the best value) is marked. Drawn at its real width so the text stays readable. */
function RunChart({ field: f, runs }: { field: TestFieldT; runs: TestRunT[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setW(Math.max(280, Math.round(el.clientWidth)))); ro.observe(el); return () => ro.disconnect(); }, []);
  const pts = runs.filter((r) => r.values[f.id] !== undefined).sort((a, b) => a.at.localeCompare(b.at)).map((r) => ({ r, v: r.values[f.id] }));
  const H = 220, L = 44, R = 14, T = 14, B = 30;
  const lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v)), pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
  const min = lo - pad, max = hi + pad;
  const x = (i: number) => L + (pts.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (pts.length - 1));
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const bestV = f.higherIsBetter ? hi : lo;
  const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : (Math.round(v * 100) / 100).toString());
  return (
    <div ref={box} className="relative mt-3" onPointerLeave={() => setHover(null)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label={`${f.name} for ${pts.length} runs, from ${fmt(pts[0].v)} to ${fmt(pts.at(-1)!.v)}. Best ${fmt(bestV)}${f.unit ?? ""}.`}>
        {[min + pad, (min + max) / 2, max - pad].map((v, i) => <g key={i}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="3 4" /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="fill-muted text-[11px]">{fmt(v)}</text></g>)}
        <polyline fill="none" stroke="var(--viz-1)" strokeWidth="2" strokeLinejoin="round" points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />
        {pts.map((p, i) => {
          const star = p.r.isBest || (!pts.some((q) => q.r.isBest) && p.v === bestV);
          return <circle key={p.r.id} cx={x(i)} cy={y(p.v)} r={star ? 7 : hover === i ? 6 : 4} fill={star ? "var(--accent)" : p.r.result === "fail" ? "var(--viz-2)" : "var(--viz-1)"} stroke="var(--surface)" strokeWidth="2" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />;
        })}
        {pts.length > 1 && <><text x={L} y={H - 8} className="fill-muted text-[11px]">{pts[0].r.label.split(",")[0]}</text><text x={W - R} y={H - 8} textAnchor="end" className="fill-muted text-[11px]">{pts.at(-1)!.r.label.split(",")[0]}</text></>}
      </svg>
      {hover !== null && pts[hover] && (
        <div className="pointer-events-none absolute top-1 rounded-[var(--radius)] border border-line bg-raised px-3 py-2 text-sm whitespace-nowrap shadow-xl" style={{ left: `clamp(0px, ${x(hover) - 70}px, calc(100% - 170px))` }}>
          <p className="font-semibold tabular-nums">{fmt(pts[hover].v)}{f.unit ?? ""}{pts[hover].r.isBest ? " ★ best" : ""}</p>
          <p className="text-muted">{pts[hover].r.label}{pts[hover].r.result ? `, ${pts[hover].r.result}` : ""}</p>
        </div>
      )}
      <p className="mt-1 text-xs text-muted">Yellow dot: the best version ({f.higherIsBetter ? "highest" : "lowest"} unless one is pinned). Orange: a failed run.</p>
    </div>
  );
}
