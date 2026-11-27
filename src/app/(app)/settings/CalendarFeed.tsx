"use client";
import { useState, useTransition } from "react";
import { icsToken } from "../calendar/actions";

export function CalendarFeed({ initialToken, appUrl }: { initialToken: string | null; appUrl: string }) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const url = token ? `${appUrl}/api/ics/${token}.ics` : null;

  const copy = async () => { if (url) { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } };
  const regenerate = () => {
    if (token && !confirm("Make a new link? The old one stops working, so you'll need to add the new one to your calendar app again.")) return;
    start(async () => setToken(await icsToken(Boolean(token))));
  };

  return (
    <section id="calendar-feed" aria-labelledby="feed-h" className="scroll-mt-8">
      <h2 id="feed-h" className="font-display text-xl font-semibold">Calendar link</h2>
      <p className="mt-2 max-w-[60ch] text-muted">
        A private link that shows your due dates in Google Calendar, Outlook or Apple Calendar. Anyone with the link can see your task titles, so keep it to yourself.
      </p>
      {url ? (
        <div className="mt-4 grid gap-3">
          <label htmlFor="feed-url" className="sr-only">Your calendar link</label>
          <input id="feed-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-h-11 w-full rounded-[var(--radius)] border border-line bg-surface px-3 font-mono text-sm" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">{copied ? "Copied" : "Copy link"}</button>
            <button type="button" disabled={pending} onClick={regenerate} className="min-h-11 rounded-[var(--radius)] border border-line px-4 font-medium hover:border-danger">Make a new link</button>
          </div>
          <details className="rounded-[var(--radius)] border border-line p-4">
            <summary className="min-h-11 cursor-pointer content-center font-medium">How to add it to Google Calendar</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
              <li>Copy the link above.</li>
              <li>On a computer, open calendar.google.com.</li>
              <li>Next to <span className="text-ink">Other calendars</span> on the left, click <span className="text-ink">+</span>, then <span className="text-ink">From URL</span>.</li>
              <li>Paste the link and click <span className="text-ink">Add calendar</span>.</li>
            </ol>
            <p className="mt-2 text-sm text-muted">Google refreshes linked calendars every few hours, so changes can take a while to appear there.</p>
          </details>
        </div>
      ) : (
        <button type="button" disabled={pending} onClick={regenerate} className="mt-4 min-h-11 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent">Create my calendar link</button>
      )}
    </section>
  );
}
