"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function LoginForm({ google }: { google: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setState({ kind: "sending" });
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/home", newUserCallbackURL: "/onboarding" });
    setState(error ? { kind: "error", message: error.message ?? "We couldn't send the link. Check the address and try again." } : { kind: "sent", email });
  }

  if (state.kind === "sent")
    return (
      <div className="mt-6 rounded-[var(--radius)] border border-line bg-raised p-4" role="status">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to <span className="break-all text-ink">{state.email}</span>. It expires in 5 minutes.
        </p>
        <button type="button" onClick={() => setState({ kind: "idle" })} className="mt-3 min-h-11 rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm text-accent-text">
          Use a different email
        </button>
      </div>
    );

  return (
    <div className="mt-6 grid gap-4">
      <form onSubmit={onSubmit} className="grid gap-3" noValidate={false}>
        <label htmlFor="email" className="text-sm font-medium">Email address</label>
        <input
          id="email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@school.edu"
          className="min-h-12 rounded-[var(--radius)] border border-line bg-bg px-3 text-base placeholder:text-muted focus:border-accent"
          aria-describedby={state.kind === "error" ? "login-error" : undefined}
        />
        {state.kind === "error" && <p id="login-error" role="alert" className="text-sm text-danger">{state.message}</p>}
        <button
          type="submit" disabled={state.kind === "sending"}
          className="min-h-12 rounded-[var(--radius)] bg-accent font-semibold text-on-accent hover:bg-accent-hover active:bg-accent-deep disabled:opacity-60"
        >
          {state.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      {google && (
        <>
          <div className="flex items-center gap-3 text-sm text-muted" aria-hidden><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <button
            type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/home", newUserCallbackURL: "/onboarding" })}
            className="min-h-12 rounded-[var(--radius)] border border-line font-medium hover:border-accent"
          >
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}
