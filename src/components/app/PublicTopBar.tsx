import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/** Header for pages outside the app (developer, privacy, terms): a clear way back in. */
export function PublicTopBar() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/home" className="inline-flex min-h-11 items-center" aria-label="HIVE-WORKSPACE home"><Logo size={26} /></Link>
      <nav aria-label="Leave this page" className="flex flex-wrap gap-2">
        <Link href="/tutorial" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-3 text-sm font-medium text-muted hover:border-accent-edge hover:text-ink">Tutorial</Link>
        <Link href="/home" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-line px-4 text-sm font-medium hover:border-accent-edge">
          <span aria-hidden>←</span> Back to the app
        </Link>
      </nav>
    </header>
  );
}
