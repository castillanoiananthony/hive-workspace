import type { Metadata } from "next";
import { Bee } from "@/components/brand/Bee";
import { PublicTopBar } from "@/components/app/PublicTopBar";

export const metadata: Metadata = { title: "Meet the developer" };

const LINKS = [
  { label: "GitHub", href: "https://github.com/castillanoiananthony" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ian-anthony-h-castillano-41a345442" },
  { label: "Facebook", href: "https://www.facebook.com/ian.anthony.castillano.2025" },
];

export default function DeveloperPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div aria-hidden className="honeycomb honeycomb-layer" />
      <PublicTopBar />
      <div lang="en" className="relative mx-auto max-w-4xl px-5 pb-10 sm:px-8 sm:pb-14 [&_p]:text-justify [&_p]:hyphens-auto">

        <section className="mt-8 grid items-center gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
          <Bee pose="wave" size={260} face="/dev/ian.webp" animate title="Ian as the HIVE-WORKSPACE bee" className="mx-auto" />
          <div>
            <p className="text-muted">The person inside the bee</p>
            <h1 className="font-display mt-1 text-4xl font-semibold leading-[1.1] sm:text-5xl">Ian Anthony H. Castillano</h1>
            <p className="mt-4 max-w-[60ch] text-lg">
              Aerospace Engineering student at Cebu Technological University, web developer and student researcher from the Philippines.
              I build tools that work for real people, from offline networks for rural towns to a search engine for aircraft research.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 font-medium hover:border-accent">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="why" className="mt-16 rounded-[var(--radius)] border border-line bg-surface p-6 sm:p-10">
          <h2 id="why" className="font-display text-2xl font-semibold">Why I built HIVE-WORKSPACE</h2>
          <div className="mt-4 max-w-[65ch] space-y-4">
            <p>
              Every group project has one person who ends up reminding everyone in the group chat. Teammates won&apos;t sign up for yet another app,
              so the planning tools go unused and the reminding never stops.
            </p>
            <p>
              Personal goals have the opposite problem. You set them for the year, and within weeks they&apos;re forgotten, because nothing connects
              the big goal to what you do this week.
            </p>
            <p>
              HIVE-WORKSPACE fixes both. Your year goals break down into months and weeks, and every task you tick off fills the honeycomb.
              Your team gets the reminders by email and can mark their part done with one click, and inside the app every team has its own feed, roles and chart.
            </p>
          </div>
        </section>

        <section aria-labelledby="built" className="mt-16">
          <h2 id="built" className="font-display text-2xl font-semibold">Also by Ian</h2>
          <article className="mt-6 flex flex-wrap items-center gap-6 rounded-[var(--radius)] border border-line bg-surface p-6 sm:p-8">
            <div className="min-w-0 flex-1 basis-72">
              <h3 className="font-display text-xl font-semibold">Aeroscraping</h3>
              <p className="mt-2 max-w-[60ch] text-muted">
                A live aerospace research search engine. Search one aircraft and it finds the exact model, its three-view drawings
                and the research papers behind it, from seven open data sources including NASA NTRS and OpenAlex.
              </p>
            </div>
            <a href="https://aeroscraping.online" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">
              Visit Aeroscraping <span className="sr-only">(opens in a new tab)</span>
            </a>
          </article>
        </section>

        <section aria-labelledby="support" className="mt-16 grid items-start gap-8 rounded-[var(--radius)] border border-line bg-surface p-6 sm:grid-cols-[1fr_auto] sm:p-10">
          <div className="max-w-[52ch]">
            <h2 id="support" className="font-display text-2xl font-semibold">Support HIVE-WORKSPACE</h2>
            <p className="mt-3">
              HIVE-WORKSPACE is free, ad-free for now, and built by one student. If it saves your group chat a few reminders,
              a small tip keeps the hive running: the domain, the email sending and late-night coffee.
            </p>
            <p className="mt-3 text-muted">Scan the code with GCash, or any banking app that supports InstaPay QR. Thank you!</p>
          </div>
          <figure className="mx-auto w-64 sm:w-80">
            {/* eslint-disable-next-line @next/next/no-img-element -- a QR code must stay pixel-sharp, no resizing service */}
            <img src="/dev/gcash-qr.webp" alt="GCash QR code for donations to Ian Anthony C." width={633} height={800} className="w-full rounded-[var(--radius)] bg-white p-2" />
            <figcaption className="mt-2 text-center text-sm text-muted">GCash / InstaPay</figcaption>
          </figure>
        </section>

        <section aria-labelledby="also" className="mt-16 border-t border-line pt-8">
          <h2 id="also" className="font-display text-lg font-semibold">Along the way</h2>
          <p className="mt-2 max-w-[65ch] text-muted">
            Silver at Science Castle Asia, Pinoy Scientist recognition, two-time first place in online publishing as a campus journalist,
            and president of two student science organisations.
          </p>
        </section>
      </div>
    </main>
  );
}
