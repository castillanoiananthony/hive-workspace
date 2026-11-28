"use client";
import { useEffect, useState } from "react";
import { flushAndRefresh } from "@/lib/offline-sync";

/**
 * Lives in the app layout. Registers the service worker, keeps this device's offline copy of your tasks fresh,
 * sends ticks made offline once you're back, and says so when you're offline.
 */
export function OfflineSync() {
  const [online, setOnline] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    // in development only when asked (localStorage "hive-sw" = "1"), so it never caches a dev build by surprise
    const want = process.env.NODE_ENV === "production" || localStorage.getItem("hive-sw") === "1";
    if (want && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => { if (!sessionStorage.getItem("hive-sw-fresh")) { reg.active?.postMessage("refresh-offline-page"); sessionStorage.setItem("hive-sw-fresh", "1"); } }).catch(() => {});
    }
    const sync = () => flushAndRefresh().then((r) => {
      if (r && r.synced + r.conflicts.length > 0) setNote(r.conflicts.length ? `Synced. ${r.conflicts.length} offline ${r.conflicts.length === 1 ? "change was" : "changes were"} skipped because ${r.conflicts.length === 1 ? "that task was" : "those tasks were"} changed more recently: ${r.conflicts.join(", ")}.` : `Back online. ${r.synced} offline ${r.synced === 1 ? "change" : "changes"} synced.`);
    }).catch(() => {});
    const up = () => { setOnline(true); sync(); }, down = () => setOnline(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's online state is only known after mounting
    setOnline(navigator.onLine); sync();
    window.addEventListener("online", up); window.addEventListener("offline", down);
    const vis = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); document.removeEventListener("visibilitychange", vis); };
  }, []);
  if (online && !note) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-lg items-center gap-3 rounded-[calc(var(--radius)*2)] border border-accent-edge/60 bg-raised px-4 py-3 text-sm shadow-2xl">
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${online ? "bg-success" : "bg-accent"}`} />
      <p className="flex-1">{online ? note : <>You&apos;re offline. You can still see and tick off your tasks; changes sync when you&apos;re back. <a href="/offline" className="font-semibold underline underline-offset-4">Open your tasks</a></>}</p>
      {online && <button type="button" onClick={() => setNote(null)} aria-label="Close" className="grid size-8 place-items-center rounded-full border border-line">×</button>}
    </div>
  );
}
