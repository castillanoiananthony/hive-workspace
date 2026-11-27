"use client";
import { useRouter } from "next/navigation";

/** "← Back": goes to the previous page in this app, or to `fallback` when the page was opened directly. */
export function BackButton({ fallback = "/home", label = "Back", className = "mb-4" }: { fallback?: string; label?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        // NavTracker counts in-app pages; if this is the first one (opened from an email or bookmark), go somewhere sensible instead
        if (Number(sessionStorage.getItem("hive-pages") ?? 0) > 1) router.back(); else router.push(fallback);
      }}
      className={`${className} inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-line pr-4 pl-3 text-sm font-medium text-muted hover:border-accent-edge hover:text-ink`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      {label}
    </button>
  );
}
