import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_THEME } from "@/lib/themes";
import { requireUser } from "@/lib/session";
import { signOut } from "../actions";
import { NameField } from "./NameField";
import { Appearance } from "./Appearance";
import { CalendarFeed } from "./CalendarFeed";
import { HoneyLoader } from "@/components/app/HoneyLoader";
import { BackButton } from "@/components/app/BackButton";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/home" />
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <Suspense fallback={<HoneyLoader label="Loading…" />}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const me = await requireUser();
  return (
    <div className="mt-8 grid gap-10">
      <section aria-labelledby="account">
        <h2 id="account" className="font-display text-xl font-semibold">Account</h2>
        <NameField initial={me.name} />
        <dl className="mt-4 grid gap-1 text-muted">
          <div><dt className="inline">Signed in as </dt><dd className="inline break-all text-ink">{me.email}</dd></div>
          <div><dt className="inline">Time zone: </dt><dd className="inline text-ink">{me.timezone}</dd></div>
        </dl>
        <form action={signOut} className="mt-4">
          <button className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-danger">Sign out</button>
        </form>
      </section>
      <Appearance initial={me.theme ?? DEFAULT_THEME} />
      <CalendarFeed initialToken={me.icsToken} appUrl={process.env.APP_URL ?? "http://localhost:3000"} />
      <section aria-labelledby="about-h">
        <h2 id="about-h" className="font-display text-xl font-semibold">About</h2>
        <nav aria-label="About HIVE-WORKSPACE" className="mt-3 grid gap-1 sm:grid-cols-2">
          {[["/developer", "Meet the developer", "Who made HIVE-WORKSPACE, and how to support it"], ["/tutorial", "Tutorial", "How every feature works"], ["/privacy", "Privacy", "What we keep and why"], ["/terms", "Terms", "The rules of the hive"]].map(([href, label, hint]) => (
            <Link key={href} href={href} className="flex min-h-14 flex-col justify-center rounded-[var(--radius)] border border-line bg-surface px-4 py-2 hover:border-accent-edge">
              <span className="font-medium">{label}</span><span className="text-sm text-muted">{hint}</span>
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
