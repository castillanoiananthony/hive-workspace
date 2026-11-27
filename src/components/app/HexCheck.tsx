"use client";
import { hexPoints } from "@/components/brand/Bee";

/** Task tick: a small hexagon that fills with honey when done. */
export function HexCheck({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className="group grid size-11 shrink-0 place-items-center rounded-[var(--radius)]"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
        <polygon
          points={hexPoints(12, 12, 10)}
          className="transition-[fill] duration-200"
          fill={checked ? "var(--accent)" : "transparent"}
          stroke={checked ? "var(--accent-edge)" : "var(--text-muted)"}
          strokeWidth="1.8" strokeLinejoin="round"
        />
        {checked && <path d="M8 12.5l2.6 2.6L16 9.6" fill="none" stroke="var(--on-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </button>
  );
}
