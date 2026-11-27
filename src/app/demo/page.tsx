import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { DemoHive } from "./DemoHive";

export const metadata: Metadata = { title: "Demo hive", description: "A read-only sample team in HIVE-WORKSPACE, with made-up data. No account needed." };

export default function DemoPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link href="/" aria-label="HIVE-WORKSPACE home page" className="inline-flex min-h-11 items-center"><span className="whitespace-nowrap sm:hidden"><Logo size={22} /></span><span className="hidden sm:inline"><Logo size={30} /></span></Link>
          <Link href="/signup" className="inline-flex min-h-11 items-center rounded-[var(--radius)] bg-accent px-4 font-semibold whitespace-nowrap text-on-accent hover:bg-accent-hover">Sign up free</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        <p className="mb-6 rounded-[calc(var(--radius)*2)] border border-accent-edge/50 bg-accent/10 px-5 py-4">
          <strong>You&apos;re looking at a demo hive.</strong> Everything here is made up and read-only: look through the tabs, nothing you do is saved.
        </p>
        <DemoHive />
      </main>
    </div>
  );
}
