import Link from "next/link";
import { PublicTopBar } from "./PublicTopBar";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="pb-10">
      <PublicTopBar />
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
      <h1 className="font-display mt-8 text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
      <div className="legal mt-8 grid max-w-[68ch] gap-4">{children}</div>
      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>{"  "}
        <Link href="/terms" className="ml-4 underline underline-offset-4">Terms</Link>{"  "}
        <Link href="/developer" className="ml-4 underline underline-offset-4">Who made this</Link>
      </p>
      </div>
    </main>
  );
}
