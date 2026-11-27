"use client";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { Bee, type BeePose } from "@/components/brand/Bee";
import { Logo } from "@/components/brand/Logo";
import { createFirstGoal, createFirstTask, createFirstTeam, finishOnboarding } from "../(app)/actions";

const STEPS: { pose: BeePose; title: string; body: string; label: string; sample: string; button: string }[] = [
  {
    pose: "wave", title: "Let's set up your first goal",
    body: "Think big: something you want done by the end of the year. Hexley filled in an example; change it or keep it.",
    label: "Your goal for this year", sample: "Finish this semester with grades I'm proud of", button: "Save goal",
  },
  {
    pose: "idle", title: "Now one small step toward it",
    body: "A task is something you can do this week. Ticking it off fills your goal's honeycomb.",
    label: "Your first task", sample: "Make a study schedule for the next two weeks", button: "Add task",
  },
  {
    pose: "fly", title: "Working with a group? (optional)",
    body: "Make a team and HIVE-WORKSPACE will send the reminders for you. Teammates only need an email address, and you can add them later.",
    label: "Team name", sample: "", button: "Create team",
  },
];

export function Wizard({ firstName }: { firstName: string }) {
  const [step, setStep] = useState(0);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const s = STEPS[step];

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("value") ?? "");
    setError(null);
    start(async () => {
      try {
        if (step === 0) setGoalId(await createFirstGoal(value));
        if (step === 1) await createFirstTask(value, goalId);
        if (step === 2) { await createFirstTeam(value); await finishOnboarding(); return; }
        setStep(step + 1);
      } catch (err) {
        unstable_rethrow(err); // finishOnboarding() redirects; that is not an error
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <Logo size={24} />
        <p className="text-sm text-muted">Step {step + 1} of 3</p>
      </div>
      <ol aria-hidden className="mb-8 grid grid-cols-3 gap-2">
        {STEPS.map((_, i) => <li key={i} className={`h-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-raised"}`} />)}
      </ol>

      <div className="rounded-[var(--radius)] border border-line bg-surface p-6 sm:p-8">
        <Bee pose={s.pose} size={96} animate />
        {step === 0 && firstName && <p className="mt-4 text-muted">Welcome, {firstName}. I&apos;m Hexley.</p>}
        <h1 className="font-display mt-2 text-2xl font-semibold">{s.title}</h1>
        <p className="mt-2 text-muted">{s.body}</p>

        <form key={step} onSubmit={submit} className="mt-6 grid gap-3">
          <label htmlFor="value" className="text-sm font-medium">{s.label}</label>
          <input
            id="value" name="value" required defaultValue={s.sample} maxLength={200} autoFocus
            className="min-h-12 rounded-[var(--radius)] border border-line bg-bg px-3 text-base focus:border-accent"
            aria-describedby={error ? "step-error" : undefined}
          />
          {error && <p id="step-error" role="alert" className="text-sm text-danger">{error}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="min-h-12 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover active:bg-accent-deep disabled:opacity-60">
              {pending ? "Saving…" : s.button}
            </button>
            {step === 2 && (
              <button type="button" disabled={pending} onClick={() => start(() => finishOnboarding())} className="min-h-12 px-3 text-muted underline underline-offset-4 hover:text-ink">
                Skip for now
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
