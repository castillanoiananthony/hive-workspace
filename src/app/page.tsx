import { Reveal } from "@/components/app/Reveal";
import type { Metadata } from "next";
import Link from "next/link";
import { Bee } from "@/components/brand/Bee";
import { Logo } from "@/components/brand/Logo";
import { HeroVisual, MockBuzz, MockCell, MockHive, MockHoneycomb } from "@/components/landing/Mocks";

export const metadata: Metadata = {
  title: { absolute: "HIVE-WORKSPACE: goals, team tasks and reminders for students" },
  description: "Keep your goals visible. Let the team reminders send themselves. Free and ad-free, made for Filipino students, groups and orgs.",
};

const primary = "inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover";
const outline = "inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] border border-line px-6 font-semibold hover:border-accent-edge";

// Signed-in visitors never see this: src/proxy.ts sends them to /home.
export default function Landing() {
  return (
    <div className="relative overflow-x-clip">
      <div aria-hidden className="honeycomb honeycomb-layer" />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link href="/" aria-label="HIVE-WORKSPACE home page" className="inline-flex min-h-12 items-center"><span className="whitespace-nowrap sm:hidden"><Logo size={22} /></span><span className="hidden sm:inline"><Logo size={34} /></span></Link>
          <nav aria-label="Account" className="flex gap-2">
            <Link href="/signin" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-line px-4 font-medium whitespace-nowrap hover:border-accent-edge">Sign in</Link>
            <Link href="/signup" className="hidden min-h-11 items-center rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover sm:inline-flex">Sign up free</Link>
          </nav>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pt-20">
          <div>
            <h1 className="rise font-display text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.01em] sm:text-6xl">
              Keep your goals visible. Let the team reminders send themselves.
            </h1>
            <p className="rise mt-6 max-w-[52ch] text-lg text-muted" style={{ "--i": 1 } as React.CSSProperties}>
              HIVE-WORKSPACE is a free, ad-free planner for Filipino students: your own goals for the sem, plus group work where everyone
              gets their part by email, and nobody has to chase the GC.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ "--i": 2 } as React.CSSProperties}>
              <Link href="/signup" className={primary}>Sign up, it&apos;s free</Link>
              <Link href="/signin" className={outline}>Sign in</Link>
              <Link href="/demo" className={`${outline} border-accent-edge/70 text-accent-text hover:bg-accent/10`}>Try a demo hive</Link>
            </div>
          </div>
          <div className="rise relative mx-auto w-full max-w-md" style={{ "--i": 3 } as React.CSSProperties}>
            <Bee pose="wave" size={88} className="absolute bottom-0 left-0 z-10 hidden sm:block" />
            <HeroVisual />
          </div>
        </section>

        <Feature id="cell" title="My Cell" lead="Your space. Break a year goal into months and weeks, then into tasks with due dates."
          points={["Type “Submit lab report Fri 5pm” and the date fills itself in", "Low, Medium or High importance, each in its own colour", "Everything with a date lands on your calendar"]}>
          <MockCell />
        </Feature>
        <Feature id="hive" flip title="The Hive" lead="Your teams. Split the work, see who's done what, keep everyone's links in one place."
          points={["Each person slides their progress and logs what they did", "Activity charts compare everyone, fairly", "Roles, a team chart and a Vault for the Drive and GitHub links"]}>
          <MockHive />
        </Feature>
        <Feature id="buzz" title="Buzz" lead="The reminders nobody wants to send. Assign a part and Buzz emails it, then nudges 3 days and 1 day before."
          points={["One click in the email marks a part done", "A weekly digest for the whole team", "No more “uy, tapos na ba?” in the group chat"]}>
          <MockBuzz />
        </Feature>
        <Feature id="honey" flip title="Progress you can see" lead="Every goal is a honeycomb cell that fills with honey as its tasks get done."
          points={["Goals fill from their tasks and smaller goals", "Teams see one overall cell per task", "Small wins show, so the big goal doesn't feel far"]}>
          <MockHoneycomb />
        </Feature>

        <section aria-labelledby="who-h" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 id="who-h" className="font-display text-3xl font-semibold sm:text-4xl">Made for how school actually works</h2>
          <Reveal className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["For students", "Plan the sem by goals, not just a to-do list. Prelims, midterms and finals stop sneaking up on you.", "cell"],
              ["For teams and orgs", "Group projects and org events where every member knows their part, their deadline and the links they need.", "hive"],
              ["For teachers", "Class mode: one join code for the class, groups inside it, and one page showing every group's progress.", "colony"],
            ].map(([t, d]) => (
              <article key={t} className="rounded-[calc(var(--radius)*2)] border border-line bg-surface p-6">
                <h3 className="font-display text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-muted">{d}</p>
              </article>
            ))}
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid items-center gap-6 rounded-[calc(var(--radius)*2)] border border-accent-edge/40 bg-surface p-8 sm:grid-cols-[auto_1fr_auto] sm:p-10">
            <Bee pose="celebrate" size={96} className="mx-auto" />
            <div>
              <h2 className="font-display text-2xl font-semibold">Free, no ads, no catch</h2>
              <p className="mt-1 text-muted">Sign up with your email or Google. Look around first if you like: the demo needs no account.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={primary}>Sign up</Link>
              <Link href="/demo" className={outline}>Try a demo hive</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:px-8">
          <Logo size={22} />
          <nav aria-label="About" className="flex flex-wrap gap-2">
            <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 hover:text-ink">Privacy</Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center px-2 hover:text-ink">Terms</Link>
            <Link href="/developer" className="inline-flex min-h-11 items-center px-2 hover:text-ink">Who made this?</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({ id, title, lead, points, flip = false, children }: { id: string; title: string; lead: string; points: string[]; flip?: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <div className={flip ? "lg:order-2" : undefined}>
        <h2 id={`${id}-h`} className="font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-[48ch] text-lg">{lead}</p>
        <Reveal as="ul" className="mt-5 grid gap-2">
          {points.map((p) => <li key={p} className="flex gap-3 text-muted"><span aria-hidden className="mt-2 size-2 shrink-0 rotate-45 rounded-[2px] bg-accent" />{p}</li>)}
        </Reveal>
      </div>
      <div className={`mx-auto w-full max-w-md ${flip ? "lg:order-1" : ""}`}>{children}</div>
    </section>
  );
}
