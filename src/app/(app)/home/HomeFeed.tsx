"use client";
import type { Life } from "@/lib/life";
import { SubjectsContext, TodayPanel } from "../cell/Life";
import Link from "next/link";
import { useState } from "react";
import { HexBadge } from "@/components/app/HexBadge";
import { Avatar, type Me } from "@/components/app/Nav";
import { Bee } from "@/components/brand/Bee";
import { HexProgress } from "@/components/brand/HexProgress";
import { formatDue } from "@/lib/dates";
import type { FeedItem } from "@/lib/feed";
import { QuickAdd, TaskRow, TourCard, type TaskView } from "../cell/CellBoard";

type Team = { id: string; name: string; color: string; open: number };

function ago(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60, h = m / 60, d = h / 24;
  if (m < 60) return `${Math.floor(m)} min ago`;
  if (h < 24) return `${Math.floor(h)} h ago`;
  if (d < 7) return `${Math.floor(d)} ${Math.floor(d) === 1 ? "day" : "days"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const LEVEL: Record<string, string> = { year: "year", month: "month", week: "week" };

export function HomeFeed({ me, tz, feed, upcoming, teams, life, open }: { me: Me; tz: string; feed: FeedItem[]; upcoming: TaskView[]; teams: Team[]; life: Life; open: { id: string; title: string }[] }) {
  const [now] = useState(() => Date.now());
  const first = (me.name || "").split(" ")[0];
  const soon = upcoming.filter((t) => new Date(t.dueAt!).getTime() < now + 7 * 86400000);
  const overdue = soon.filter((t) => new Date(t.dueAt!).getTime() < now).length;

  return (
    <SubjectsContext.Provider value={life.subjects}>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="mx-auto w-full max-w-2xl min-w-0">
        <h1 className="sr-only">Home</h1>
        <TourCard />
        {/* composer: the quickest way to add something, like a status box */}
        <section aria-label="Add a task" className="flex gap-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <Avatar me={me} size={44} />
          <div className="min-w-0 flex-1 [&_form]:mt-0">
            <QuickAdd tz={tz} label={first ? `What do you need to do, ${first}?` : "What do you need to do?"} />
          </div>
        </section>

        <TodayPanel life={life} open={open} />

        {soon.length > 0 && (
          <p className="mt-4 flex flex-wrap gap-2 text-sm">
            {overdue > 0 && <Link href="/cell/tasks" className="rounded-full bg-danger/15 px-3 py-1.5 font-medium text-danger">{overdue} overdue</Link>}
            <Link href="/calendar" className="rounded-full bg-raised px-3 py-1.5 font-medium">{soon.length - overdue} due this week</Link>
          </p>
        )}

        <h2 className="font-display mt-8 mb-3 text-lg font-semibold">Activity</h2>
        {feed.length === 0 ? <Welcome /> : (
          <ol className="grid gap-4">
            {feed.map((item) => <li key={item.id}><Card item={item} me={me} now={now} tz={tz} /></li>)}
          </ol>
        )}
      </div>

      <aside aria-label="Up next and teams" className="grid content-start gap-6 lg:sticky lg:top-8 lg:self-start">
        <section aria-labelledby="home-upnext" className="rounded-[var(--radius)] border border-line bg-surface p-4">
          <h2 id="home-upnext" className="font-display font-semibold">Up next</h2>
          {soon.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing due this week.</p> : <ul className="mt-2 grid gap-1">{soon.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} tz={tz} />)}</ul>}
          <Link href="/cell" className="mt-2 inline-flex min-h-11 items-center rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm font-medium text-accent-text">Open My Cell</Link>
        </section>
        <section aria-labelledby="home-teams" className="rounded-[var(--radius)] border border-line bg-surface p-4">
          <h2 id="home-teams" className="font-display font-semibold">Your teams</h2>
          {teams.length === 0 ? <p className="mt-2 text-sm text-muted">No teams yet.</p> : (
            <ul className="mt-2 grid gap-1">
              {teams.map((t) => (
                <li key={t.id}><Link href={`/hive/${t.id}`} className="flex min-h-11 items-center gap-3 rounded-[var(--radius)] px-1 hover:bg-raised">
                  <HexBadge label={t.name} color={t.color} size={28} /><span className="min-w-0 flex-1 truncate">{t.name}</span><span className="text-sm text-muted">{t.open} open</span>
                </Link></li>
              ))}
            </ul>
          )}
          <Link href="/hive" className="mt-2 inline-flex min-h-11 items-center rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm font-medium text-accent-text">{teams.length ? "All teams" : "Make a team"}</Link>
        </section>
      </aside>
    </div>
    </SubjectsContext.Provider>
  );
}

function Shell({ avatar, children, time, action }: { avatar: React.ReactNode; children: React.ReactNode; time: string; action?: React.ReactNode }) {
  return (
    <article className="rounded-[var(--radius)] border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="shrink-0">{avatar}</div>
        <div className="min-w-0 flex-1">
          {children}
          <p className="mt-1 text-sm text-muted">{time}</p>
        </div>
      </div>
      {action && <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">{action}</div>}
    </article>
  );
}

const linkBtn = "inline-flex min-h-11 items-center rounded-[var(--radius)] px-3 text-sm font-medium hover:bg-raised";

function Card({ item, me, now, tz }: { item: FeedItem; me: Me; now: number; tz: string }) {
  const time = ago(item.at, now);
  switch (item.kind) {
    case "teammate_done":
      return (
        <Shell avatar={<HexBadge label={item.member} color={item.color} size={44} />} time={`${time} in ${item.team}`}
          action={<Link href={`/hive/${item.teamId}`} className={linkBtn}>See the team board</Link>}>
          <p><span className="font-semibold">{item.member}</span> marked <span className="font-semibold">“{item.task}”</span> done <span className="text-success">✓</span></p>
        </Shell>
      );
    case "you_done":
      return (
        <Shell avatar={<Avatar me={me} size={44} />} time={time} action={<Link href={`/tasks/${item.taskId}`} className={linkBtn}>Open task</Link>}>
          <p><span className="font-semibold">You</span> finished <span className="font-semibold">“{item.task}”</span></p>
          {item.goal && item.goalProgress !== null && (
            <div className="mt-3 flex items-center gap-3 rounded-[var(--radius)] bg-raised p-3">
              <HexProgress value={item.goalProgress} size={36} label={`${item.goal} progress`} />
              <span className="min-w-0 text-sm">Toward <span className="font-medium">{item.goal}</span></span>
            </div>
          )}
        </Shell>
      );
    case "assigned":
      return (
        <Shell avatar={<HexBadge label={item.team} color={item.color} size={44} />} time={`${time} in ${item.team}`} action={<Link href={`/tasks/${item.taskId}`} className={linkBtn}>Open task</Link>}>
          <p>
            <span className="font-semibold">You</span> {item.people.length ? "assigned" : "added"} <span className="font-semibold">“{item.task}”</span>
            {item.people.length > 0 && <> to {item.people.length <= 3 ? item.people.join(", ") : `${item.people.slice(0, 2).join(", ")} and ${item.people.length - 2} more`}</>}
          </p>
          {item.dueAt && <p className="mt-1 text-sm">Due {formatDue(new Date(item.dueAt), item.hasTime, tz)}</p>}
        </Shell>
      );
    case "goal_new":
      return (
        <Shell avatar={<Avatar me={me} size={44} />} time={time} action={<Link href="/cell" className={linkBtn}>Plan a task for it</Link>}>
          <p><span className="font-semibold">You</span> set a new {LEVEL[item.level]} goal</p>
          <div className="mt-3 flex items-center gap-3 rounded-[var(--radius)] bg-raised p-3">
            <HexProgress value={item.progress} size={40} label={`${item.goal} progress`} />
            <span className="min-w-0 font-medium">{item.goal}</span>
          </div>
        </Shell>
      );
    case "goal_done":
      return (
        <Shell avatar={<Bee pose="celebrate" size={44} />} time={time}>
          <p><span className="font-semibold">Goal complete:</span> {item.goal}</p>
          <p className="mt-1 text-sm text-muted">Every task under this {LEVEL[item.level]} goal is done. Nice work.</p>
        </Shell>
      );
  }
}

function Welcome() {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-6 text-center">
      <div className="flex justify-center"><Bee pose="wave" size={88} animate /></div>
      <p className="font-display mt-3 text-xl font-semibold">Your feed fills up as things happen</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-muted">Finished tasks, new goals, teammates marking their part done: it all shows up here.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/cell" className="inline-flex min-h-11 items-center rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">Set a goal</Link>
        <Link href="/hive" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent-edge">Make a team</Link>
        <Link href="/tutorial" className="inline-flex min-h-11 items-center rounded-[var(--radius)] px-4 font-medium text-accent-text">Take the tour</Link>
      </div>
    </div>
  );
}
