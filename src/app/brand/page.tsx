import type { Metadata } from "next";
import { Bee, type BeePose } from "@/components/brand/Bee";
import { HexProgress } from "@/components/brand/HexProgress";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { ThemePreview } from "./ThemePreview";

export const metadata: Metadata = { title: "Brand review" };

const POSES: { pose: BeePose; name: string; use: string }[] = [
  { pose: "idle", name: "Idle", use: "Onboarding, loading" },
  { pose: "wave", name: "Waving", use: "Welcome, first steps" },
  { pose: "sleep", name: "Resting", use: "Empty states" },
  { pose: "celebrate", name: "Celebrating", use: "Goal reaches 100%, Mark done" },
  { pose: "fly", name: "Flying", use: "Sending Buzz emails" },
];

const NAMES = [
  { name: "Hexley", why: "After the hexagon cells of the hive. Friendly without being cute." },
  { name: "Mead", why: "Short, warm and a little grown-up, like the honey drink." },
  { name: "Comb", why: "Named after the honeycomb itself. Plain and easy to remember." },
];

export default function BrandPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-12 flex flex-col gap-6 border-b border-line pb-10">
        <Logo size={36} />
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Logo and bee for your approval</h1>
          <p className="mt-3 text-muted">
            Nothing here is used in the app yet. Switch themes and try a custom accent to see that the bee, the logo and the progress cell follow it.
          </p>
        </div>
        <ThemePreview />
      </header>

      <section aria-labelledby="logo" className="mb-14">
        <h2 id="logo" className="font-display mb-6 text-xl font-semibold">Logo</h2>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Tile label="Wordmark with mark"><Logo size={40} /></Tile>
          <Tile label="Mark alone"><LogoMark size={64} title="HIVE-WORKSPACE mark" /></Tile>
          <Tile label="Favicon size">
            <div className="flex items-end gap-4"><LogoMark size={16} /><LogoMark size={24} /><LogoMark size={32} /></div>
          </Tile>
        </div>
      </section>

      <section aria-labelledby="bee" className="mb-14">
        <h2 id="bee" className="font-display mb-2 text-xl font-semibold">The bee</h2>
        <p className="mb-6 max-w-2xl text-muted">One drawing, five poses. A round body with a big head joined to it and two wings, in the theme&apos;s accent and ink.</p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {POSES.map((p) => (
            <li key={p.pose} className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3 pb-4 pt-6 text-center">
              <Bee pose={p.pose} size={104} animate title={`Bee, ${p.name.toLowerCase()}`} />
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-muted">{p.use}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="progress" className="mb-14">
        <h2 id="progress" className="font-display mb-6 text-xl font-semibold">Progress cell</h2>
        <div className="flex flex-wrap items-center gap-8 rounded-[var(--radius)] border border-line bg-surface p-6">
          {[0, 25, 60, 100].map((v) => <HexProgress key={v} value={v} label={`${v} percent`} />)}
        </div>
      </section>

      <section aria-labelledby="names">
        <h2 id="names" className="font-display mb-6 text-xl font-semibold">Pick a name for the bee</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {NAMES.map((n) => (
            <li key={n.name} className="rounded-[var(--radius)] border border-line bg-surface p-5">
              <p className="font-display text-2xl font-semibold text-accent-text">{n.name}</p>
              <p className="mt-2 text-sm text-muted">{n.why}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-h-40 flex-col justify-between gap-6 rounded-[var(--radius)] border border-line bg-surface p-6">
      <div className="flex flex-1 items-center">{children}</div>
      <figcaption className="text-sm text-muted">{label}</figcaption>
    </figure>
  );
}
