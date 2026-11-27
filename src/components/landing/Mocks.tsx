import { ImportanceTag } from "@/components/app/ImportanceTag";
import { HexBadge } from "@/components/app/HexBadge";
import { HexProgress } from "@/components/brand/HexProgress";

// Small, static copies of real screens, filled with sample data, for the landing page.
const card = "rounded-[calc(var(--radius)*2)] border border-line bg-surface p-5 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)]";

export function MockCell() {
  const goals = [
    { level: "Year goal, A.Y. 2026–2027", title: "Finish 1st Sem with grades I'm proud of", pct: 62, indent: 0 },
    { level: "Month goal, October", title: "Get through midterms", pct: 45, indent: 1 },
    { level: "Week goal, Week 3", title: "Lab report and Calc review", pct: 80, indent: 2 },
  ];
  const tasks = [
    { t: "Submit lab report", due: "Fri, 5:00 PM", imp: 3, done: false },
    { t: "Review Calc chapter 3", due: "Sat", imp: 2, done: false },
    { t: "Print midterm reviewer", due: "Done", imp: 0, done: true },
  ];
  return (
    <div className={card} aria-label="Preview of My Cell" role="img">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {goals.map((g) => (
          <li key={g.title} className="flex items-center gap-3" style={{ paddingLeft: g.indent * 20 }}>
            <HexProgress value={g.pct} size={g.indent ? 36 : 44} label={`${g.title}: ${g.pct}%`} showValue={false} />
            <div className="min-w-0"><p className="truncate font-medium">{g.title}</p><p className="text-sm text-muted">{g.level}. {g.pct}% done</p></div>
          </li>
        ))}
      </ul>
      <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 border-t border-line pt-4">
        {tasks.map((x) => (
          <li key={x.t} className="flex items-center gap-2 text-sm">
            <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-[5px] border ${x.done ? "border-success bg-success/20 text-success" : "border-line"}`}>{x.done ? "✓" : ""}</span>
            <span className={`min-w-0 flex-1 truncate ${x.done ? "text-muted line-through" : ""}`}>{x.t}</span>
            <ImportanceTag level={x.imp} />
            {!x.done && <span className="shrink-0 text-muted">{x.due}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MockHive() {
  const people = [{ n: "Ana Cruz", p: 100 }, { n: "Ben Santos", p: 60 }, { n: "Carla Reyes", p: 25 }];
  return (
    <div className={card} aria-label="Preview of a team in The Hive" role="img">
      <div className="flex items-center gap-3">
        <HexBadge label="Physics Lab Group" color="#F5B80B" size={40} />
        <div className="min-w-0"><p className="font-display font-semibold">Physics Lab Group</p><p className="text-sm text-muted">4 members, 3 open tasks</p></div>
      </div>
      <div className="mt-4 rounded-[var(--radius)] border-2 p-4" style={{ borderColor: "#E5484D" }}>
        <div className="flex items-center justify-between gap-2"><p className="font-medium">Experiment 4: Projectile motion</p><ImportanceTag level={3} /></div>
        <p className="text-sm text-muted">Due Fri, 5:00 PM. 1 of 3 done</p>
        <ul className="mt-3 grid gap-2.5">
          {people.map((x) => (
            <li key={x.n} className="grid grid-cols-[auto_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <HexBadge label={x.n} color="#F5B80B" size={26} />
              <span className="block h-2 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full" style={{ width: `${x.p}%`, background: x.p === 100 ? "var(--viz-3)" : "var(--accent)" }} /></span>
              <span className="text-right tabular-nums text-muted">{x.p === 100 ? "✓" : `${x.p}%`}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MockBuzz() {
  return (
    <div className="rounded-[calc(var(--radius)*2)] bg-[#f6f5f2] p-5 text-[#1d1d20] shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)]" aria-label="Preview of a Buzz reminder email" role="img">
      <p className="text-xs text-[#5c5b57]">From HIVE-WORKSPACE to ben@school.edu</p>
      <p className="mt-1 font-semibold">Reminder: “Experiment 4” is due tomorrow</p>
      <div className="mt-4 rounded-[12px] bg-white p-4">
        <p className="text-sm">Hi Ben, Ana assigned you a part of <b>Experiment 4: Projectile motion</b> in Physics Lab Group.</p>
        <ol className="mt-2 list-decimal pl-5 text-sm"><li>Record 5 launch angles</li><li>Upload the table to the shared Drive</li></ol>
        <p className="mt-3 text-sm"><b>Due:</b> Fri, 5:00 PM</p>
        <span className="mt-4 inline-block rounded-[10px] bg-[#F5B80B] px-4 py-2 text-sm font-semibold text-[#17171a]">Mark my part done</span>
      </div>
    </div>
  );
}

export function MockHoneycomb() {
  const steps = [0, 25, 50, 75, 100];
  return (
    <div className={`${card} flex flex-wrap items-end justify-center gap-4`} aria-label="A honeycomb cell filling from 0 to 100 percent" role="img">
      {steps.map((v) => <div key={v} className="grid justify-items-center gap-1"><HexProgress value={v} size={58} label={`${v}%`} showValue={false} /><span className="text-sm tabular-nums text-muted">{v}%</span></div>)}
    </div>
  );
}

/** Hero picture: one big goal cell filling with honey, with the kind of nudges Buzz sends floating beside it. */
export function HeroVisual() {
  const toast = "absolute flex items-center gap-3 rounded-[calc(var(--radius)*1.5)] border border-line bg-raised/95 px-4 py-3 text-sm shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur";
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[26rem]" role="img" aria-label="A goal shown as a honeycomb cell, 62% full, with Buzz notifications: Ben marked his part done, and the lab report is due tomorrow">
      <div className="absolute inset-[8%] grid place-items-center [&_svg]:h-auto [&_svg]:max-w-full [&>*]:max-w-full">
        <HexProgress value={62} size={300} label="1st Sem goal: 62%" showValue={false} />
      </div>
      {/* the number sits in the honey (lower part of the cell), dark on yellow */}
      <div className="absolute inset-0 grid place-items-center pt-[22%]">
        <div className="text-center">
          <p className="font-display text-6xl font-semibold text-on-accent tabular-nums drop-shadow-[0_1px_0_rgb(255_255_255/0.3)]">62%</p>
          <p className="font-medium text-on-accent/80">1st Sem goal</p>
        </div>
      </div>
      <div className={`${toast} top-[4%] left-0 sm:-left-[8%]`}>
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-success/20 text-success">✓</span>
        <span><b>Ben</b> marked his part done</span>
      </div>
      <div className={`${toast} right-0 bottom-[6%] sm:right-[-8%]`}>
        <span aria-hidden className="size-2.5 rounded-full bg-[#E5484D]" />
        <span>Lab report is due <b>tomorrow</b></span>
      </div>
    </div>
  );
}
