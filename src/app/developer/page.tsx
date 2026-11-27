import type { Metadata } from "next";
import Link from "next/link";
import { Bee } from "@/components/brand/Bee";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Meet the developer" };

const PROJECTS = [
  {
    name: "CEURA-LPN",
    role: "Researcher and developer",
    text: "An encrypted, solar-powered offline network that lets schools, health centres and LGUs share lessons, medical guides and disaster alerts over local Wi-Fi with no internet. File transfers got 58.6% faster.",
  },
  {
    name: "Aeroscraping",
    role: "Creator and developer",
    text: "A live aerospace research search engine. Search one aircraft and it finds the exact model, its three-view drawings and the research papers behind it, from seven open data sources.",
    href: "https://aeroscraping.online",
  },
  {
    name: "ASCEND",
    role: "Lead developer, NASA Space Apps Challenge 2026",
    text: "A Unity game where players plan a space mission, build the rocket and satellite, and fly it to orbit, built by a team in 48 hours.",
  },
  {
    name: "ALSA: Tan-aw Catbalogan",
    role: "Lead developer, city hackathon",
    text: "A community app connecting Catbalogan residents with local government services.",
  },
];

const LINKS = [
  { label: "GitHub", href: "https://github.com/castillanoiananthony" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ian-anthony-h-castillano-41a345442" },
  { label: "Aeroscraping", href: "https://aeroscraping.online" },
];

export default function DeveloperPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="honeycomb honeycomb-layer" />
      <div className="relative mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <Link href="/" className="inline-flex min-h-11 items-center"><Logo size={28} /></Link>

        <section className="mt-10 grid items-center gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
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
              Your team gets the reminders by email, and they can mark their part done with one click, no account needed.
            </p>
          </div>
        </section>

        <section aria-labelledby="built" className="mt-16">
          <h2 id="built" className="font-display text-2xl font-semibold">Other things I&apos;ve built</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PROJECTS.map((p) => (
              <li key={p.name} className="border-l-2 border-accent-edge pl-5">
                <h3 className="font-display text-lg font-semibold">
                  {p.href ? <a href={p.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{p.name}</a> : p.name}
                </h3>
                <p className="text-sm text-muted">{p.role}</p>
                <p className="mt-2">{p.text}</p>
              </li>
            ))}
          </ul>
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
