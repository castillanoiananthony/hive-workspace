import type { Metadata } from "next";
import { Suspense } from "react";
import { DEFAULT_THEME } from "@/lib/themes";
import { requireUser } from "@/lib/session";
import { signOut } from "../actions";
import { Appearance } from "./Appearance";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Loading…</p>}>
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
        <dl className="mt-4 grid gap-1 text-muted">
          <div><dt className="inline">Signed in as </dt><dd className="inline break-all text-ink">{me.email}</dd></div>
          <div><dt className="inline">Time zone: </dt><dd className="inline text-ink">{me.timezone}</dd></div>
        </dl>
        <form action={signOut} className="mt-4">
          <button className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-danger">Sign out</button>
        </form>
      </section>
      <Appearance initial={me.theme ?? DEFAULT_THEME} />
    </div>
  );
}
