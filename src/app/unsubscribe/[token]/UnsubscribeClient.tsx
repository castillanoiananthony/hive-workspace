"use client";
import { useState, useTransition } from "react";
import { Bee } from "@/components/brand/Bee";
import { resubscribe, unsubscribe } from "./actions";

export function UnsubscribeClient({ token, team, initiallySubscribed }: { token: string; team: string; initiallySubscribed: boolean }) {
  const [subscribed, setSubscribed] = useState(initiallySubscribed);
  const [pending, start] = useTransition();
  return (
    <>
      <div className="flex justify-center"><Bee pose={subscribed ? "wave" : "sleep"} size={96} /></div>
      <h1 className="font-display mt-4 text-2xl font-semibold" role="status">{subscribed ? `Stop emails from ${team}?` : `You won't get emails from ${team}`}</h1>
      <p className="mt-2 text-muted">
        {subscribed
          ? "You'll stop getting task assignments, reminders and the weekly summary from this team. Other teams aren't affected."
          : "The team owner will see that you turned emails off. Changed your mind? Turn them back on below."}
      </p>
      <button type="button" disabled={pending}
        onClick={() => start(async () => { const r = subscribed ? await unsubscribe(token) : await resubscribe(token); if (r) setSubscribed(r.subscribed); })}
        className={`mt-6 min-h-11 rounded-[var(--radius)] px-5 font-semibold ${subscribed ? "border border-danger text-danger" : "bg-accent text-on-accent hover:bg-accent-hover"}`}>
        {subscribed ? "Stop emails from this team" : "Turn emails back on"}
      </button>
    </>
  );
}
