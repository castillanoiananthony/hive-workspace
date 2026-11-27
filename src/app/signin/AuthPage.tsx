import Link from "next/link";
import { Bee } from "@/components/brand/Bee";
import { Logo } from "@/components/brand/Logo";
import { googleEnabled } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

/** Sign in and sign up are the same magic-link flow; only the words change. */
export function AuthPage({ mode }: { mode: "signin" | "signup" }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      <div aria-hidden className="honeycomb honeycomb-layer" />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex justify-center"><Link href="/" aria-label="HIVE-WORKSPACE home page"><Logo size={30} /></Link></div>
        <div className="rounded-[var(--radius)] border border-line bg-surface p-6 sm:p-8">
          <div className="-mt-16 mb-2 flex justify-center"><Bee pose="wave" size={88} animate /></div>
          <h1 className="font-display text-center text-2xl font-semibold">{mode === "signup" ? "Create your free account" : "Welcome back"}</h1>
          <p className="mt-2 text-center text-muted">{mode === "signup" ? "Just your email. We'll send a link, no password needed." : "We'll email you a sign-in link. No password to remember."}</p>
          <LoginForm google={googleEnabled} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "signup" ? <>Already have an account? <a className="text-accent-text underline underline-offset-4" href="/signin">Sign in</a></> : <>New here? <a className="text-accent-text underline underline-offset-4" href="/signup">Create an account</a></>}
        </p>
        <p className="mt-3 text-center text-sm text-muted">
          Joining a team? Use the email address your invite was sent to. <a className="text-accent-text underline underline-offset-4" href="/developer">Who made this?</a>
        </p>
        <p className="mt-3 text-center text-sm text-muted">
          <a className="underline underline-offset-4" href="/privacy">Privacy</a>
          <a className="ml-4 underline underline-offset-4" href="/terms">Terms</a>
        </p>
      </div>
    </main>
  );
}
