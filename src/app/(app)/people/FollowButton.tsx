"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setFollowing } from "./actions";

/** Follow / Following toggle. Updates at once, rolls back if the server says no. */
export function FollowButton({ userId, name, initial, size = "md" }: { userId: string; name: string; initial: boolean; size?: "sm" | "md" }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const h = size === "sm" ? "min-h-10 px-3 text-sm" : "min-h-11 px-5";
  return (
    <button type="button" disabled={pending} aria-pressed={on} aria-label={`${on ? "Unfollow" : "Follow"} ${name}`}
      onClick={() => { const next = !on; setOn(next); start(async () => { try { await setFollowing(userId, next); router.refresh(); } catch { setOn(!next); } }); }}
      className={`group shrink-0 rounded-full font-semibold disabled:opacity-60 ${h} ${on ? "border border-line text-ink hover:border-danger hover:text-danger" : "bg-accent text-on-accent hover:bg-accent-hover"}`}>
      {on ? <><span className="group-hover:hidden">Following</span><span className="hidden group-hover:inline">Unfollow</span></> : "Follow"}
    </button>
  );
}
