import { useId } from "react";
import { hexPoints } from "./Bee";

/** A hexagon cell that fills with honey from the bottom up, with the percentage beside or inside it. */
export function HexProgress({ value, size = 56, label, showValue = true }: { value: number; size?: number; label: string; showValue?: boolean }) {
  const id = useId();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const pts = hexPoints(50, 50, 46);
  const top = 4, bottom = 96; // pointy-top hex spans y 4..96
  const fillY = bottom - ((bottom - top) * pct) / 100;
  return (
    <span className="inline-flex items-center gap-2" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <clipPath id={id}>
          <polygon points={pts} />
        </clipPath>
        <polygon points={pts} fill="var(--surface-raised)" />
        <rect className="hex-fill" x="0" y={fillY} width="100" height={100 - fillY} fill="var(--accent)" clipPath={`url(#${id})`} />
        <polygon points={pts} fill="none" stroke={pct > 0 ? "var(--accent-edge)" : "var(--border)"} strokeWidth="4" strokeLinejoin="round" />
      </svg>
      {showValue && <span className="tabular-nums text-sm font-semibold text-[var(--text)]">{pct}%</span>}
    </span>
  );
}
