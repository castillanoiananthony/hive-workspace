// Browser-only: sends queued offline ticks, then refreshes the offline copy of your tasks.
import { clearOps, getOps, saveTasks } from "./offline-store";

export async function flushAndRefresh(): Promise<{ synced: number; conflicts: string[] } | null> {
  if (!navigator.onLine) return null;
  let synced = 0, conflicts: string[] = [];
  const ops = await getOps().catch(() => []);
  if (ops.length) {
    const res = await fetch("/api/me/tasks/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ops }) }).catch(() => null);
    if (!res?.ok) return null; // try again next time
    const r = await res.json();
    synced = r.applied; conflicts = r.conflicts ?? [];
    await clearOps(ops.map((o) => o.key));
  }
  const res = await fetch("/api/me/tasks", { cache: "no-store" }).catch(() => null);
  if (res?.ok) await saveTasks((await res.json()).tasks);
  return { synced, conflicts };
}
