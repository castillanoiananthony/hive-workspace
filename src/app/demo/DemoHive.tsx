"use client";
import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { TeamView } from "../(app)/hive/[teamId]/TeamView";

type P = ComponentProps<typeof TeamView>;
const TZ = "Asia/Manila";

/** Made-up team data, dated relative to today so the demo always looks current. */
function sample(now: number): P {
  const day = 86_400_000, iso = (d: number) => new Date(now + d * day).toISOString();
  const ymd = (d: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(now + d * day));
  const m = (id: string, name: string, isAdmin = false, parentId: string | null = "m1", position = 0) =>
    ({ id, userId: null, name, nickname: null, email: null, joined: true, isAdmin, roleId: isAdmin ? "r1" : "r2", perms: [], parentId: isAdmin ? null : parentId, position, avatar: null, unsubscribed: false });
  const members = [m("m1", "Ana Cruz", true), m("m2", "Ben Santos", false, "m1", 0), m("m3", "Carla Reyes", false, "m1", 1), m("m4", "Dino Villanueva", false, "m2", 0)];
  const tasks = [
    { id: "t1", title: "Experiment 4: Projectile motion", status: "doing" as const, dueAt: iso(2), hasTime: true, importance: 3 },
    { id: "t2", title: "Draft the lab report introduction", status: "doing" as const, dueAt: iso(5), hasTime: false, importance: 2 },
    { id: "t3", title: "Buy materials for the launcher", status: "done" as const, dueAt: iso(-3), hasTime: false, importance: 1 },
    { id: "t4", title: "Practice the presentation", status: "todo" as const, dueAt: iso(9), hasTime: false, importance: 0 },
  ];
  const a = (taskId: string, memberId: string, progress: number, done = false) => ({ taskId, memberId, progress, doneAt: done ? iso(-1) : null });
  const assigned = [a("t1", "m2", 60), a("t1", "m3", 100, true), a("t1", "m4", 20), a("t2", "m1", 40), a("t2", "m3", 70), a("t3", "m4", 100, true), a("t4", "m1", 0), a("t4", "m2", 0), a("t4", "m3", 0), a("t4", "m4", 0)];
  const L = (id: string, taskId: string, memberId: string, progress: number, note: string, ago: number, done = false) => ({ id, taskId, memberId, progress, done, note, at: iso(-ago) });
  const logs = [L("l1", "t1", "m3", 100, "Recorded all 5 launch angles", 1, true), L("l2", "t1", "m2", 60, "Built the table, two angles left", 1.2), L("l3", "t2", "m3", 70, "Intro and objectives done", 2), L("l4", "t3", "m4", 100, "Bought the PVC pipe and tape", 3, true), L("l5", "t2", "m1", 40, "Outline shared in the Vault", 4), L("l6", "t1", "m4", 20, "Read the procedure", 5)];
  const days = Array.from({ length: 14 }, (_, i) => ({ date: ymd(i - 13), label: new Intl.DateTimeFormat("en", { timeZone: TZ, month: "short", day: "numeric" }).format(new Date(now + (i - 13) * day)), done: [0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 0, 1, 1, 0][i], created: [1, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0][i], posts: [1, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 2, 0][i], updates: [0, 0, 1, 0, 1, 0, 1, 1, 0, 2, 1, 2, 1, 0][i] }));
  const post = (id: string, memberId: string, body: string, ago: number) => ({ kind: "post" as const, id, memberId, body, at: iso(-ago), hidden: false });
  return {
    team: { id: "demo", name: "Physics Lab Group", color: "#F5B80B", digestEnabled: true, digestDay: 1, joinCode: null, app: "", importanceColors: null },
    me: { memberId: "viewer", isAdmin: false, perms: [] },
    members, tasks, assigned, logs, days, tz: TZ,
    roles: [{ id: "r1", name: "Leader", perms: [], isLeader: true }, { id: "r2", name: "Member", perms: [], isLeader: false }],
    stream: [post("p1", "m1", "Reminder: we present on Monday! Upload your parts to the Vault by Saturday night.", 0.2), post("p2", "m3", "Done with the angles. Results are in the shared sheet.", 1), post("p3", "m2", "Can someone check my table? Two angles look off.", 1.3)],
    links: [
      { id: "v1", title: "Lab group shared folder", url: "https://drive.google.com/drive/folders/demo", note: "Put your parts here", memberId: "m1", at: iso(-6) },
      { id: "v2", title: "Results table", url: "https://docs.google.com/spreadsheets/d/demo", note: null, memberId: "m3", at: iso(-1) },
      { id: "v3", title: "Presentation deck", url: "https://www.canva.com/design/demo", note: "Slides 1–4 are Ana's", memberId: "m1", at: iso(-2) },
    ],
    calendar: tasks.map((t) => ({ id: t.id, title: t.title, done: t.status === "done", date: ymd(Math.round((Date.parse(t.dueAt) - now) / day)), time: null, space: "demo", spaceName: "Physics Lab Group", color: "#F5B80B", tint: [null, "#3FB27F", "#4C8DF6", "#E5484D"][t.importance] })),
    templates: [], log: [],
  };
}

export function DemoHive() {
  const [data, setData] = useState<P | null>(null);
  const [note, setNote] = useState(false);
  // dates come from the visitor's clock, so they are built once in the browser after the first paint
  // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-time, client-only initialisation
  useEffect(() => setData(sample(Date.now())), []);
  if (!data) return <HoneyLoader label="Opening the demo hive…" />;
  return (
    <div
      // read-only: links into real pages (tasks, profiles) would need an account
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (a && /^\/(tasks|u|hive|profile)\b/.test(a.getAttribute("href") ?? "")) { e.preventDefault(); setNote(true); }
      }}
    >
      <TeamView {...data} />
      {note && (
        <div role="status" className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-center gap-3 rounded-[calc(var(--radius)*2)] border border-accent-edge/60 bg-raised px-5 py-4 shadow-2xl">
          <p className="flex-1 text-sm">This is a demo with made-up data. Sign up to open tasks and make your own hive.</p>
          <Link href="/signup" className="shrink-0 rounded-[var(--radius)] bg-accent px-3 py-2 text-sm font-semibold text-on-accent">Sign up</Link>
          <button type="button" onClick={() => setNote(false)} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-ink">✕</button>
        </div>
      )}
    </div>
  );
}
