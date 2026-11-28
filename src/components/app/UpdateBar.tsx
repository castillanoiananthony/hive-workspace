"use client";
import { useEffect, useState } from "react";

/** Open tabs keep running the version they loaded. When a newer one is live, offer a one-tap refresh. */
export function UpdateBar({ build }: { build: string }) {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (build === "dev") return;
    const check = () => { if (document.visibilityState === "visible") fetch("/api/version", { cache: "no-store" }).then((r) => r.json()).then((d: { v: string }) => { if (d.v && d.v !== "dev" && d.v !== build) setStale(true); }).catch(() => {}); };
    check();
    const t = setInterval(check, 5 * 60_000);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", check); };
  }, [build]);
  if (!stale) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-[var(--radius)] border border-accent-edge/70 bg-raised px-4 py-3 md:bottom-6">
      <p className="min-w-0 flex-1 text-sm">A new version of HIVE-WORKSPACE is ready.</p>
      <button type="button" onClick={() => location.reload()} className="min-h-10 shrink-0 rounded-[var(--radius)] bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">Refresh</button>
    </div>
  );
}
