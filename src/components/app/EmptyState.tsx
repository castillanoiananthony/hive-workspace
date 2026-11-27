import type { BeePose } from "@/components/brand/Bee";
import { Bee } from "@/components/brand/Bee";

/** Friendly empty page: Hexley, one sentence of context and a single clear action. */
export function EmptyState({ pose = "sleep", title, body, action }: { pose?: BeePose; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="relative grid place-items-center overflow-hidden rounded-[var(--radius)] border border-dashed border-line px-6 py-14 text-center">
      <div aria-hidden className="honeycomb honeycomb-layer" />
      <div className="relative grid justify-items-center gap-3">
        <Bee pose={pose} size={96} />
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="max-w-[42ch] text-muted">{body}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
