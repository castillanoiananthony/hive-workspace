import { hexPoints } from "@/components/brand/Bee";

/** Loading indicator: a honeycomb cell that fills with honey, empties, and fills again. */
export function HoneyLoader({ label = "Loading…", size = 56, inline = false }: { label?: string; size?: number; inline?: boolean }) {
  const pts = hexPoints(50, 50, 44);
  return (
    <div role="status" aria-live="polite" className={inline ? "inline-flex items-center gap-3" : "grid min-h-[40vh] place-items-center content-center gap-3 py-10 text-center"}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="honey-loader">
        <defs><clipPath id="honey-loader-clip"><polygon points={pts} /></clipPath></defs>
        <polygon points={pts} fill="var(--surface-raised)" />
        <g clipPath="url(#honey-loader-clip)">
          <rect className="honey-loader-fill" x="0" y="0" width="100" height="100" fill="var(--accent)" />
          {/* a soft wave on the honey's surface */}
          <path className="honey-loader-wave" d="M-50 6 Q-37.5 0 -25 6 T0 6 T25 6 T50 6 T75 6 T100 6 T125 6 T150 6 V20 H-50 Z" fill="var(--accent)" />
        </g>
        <polygon points={pts} fill="none" stroke="var(--accent-edge)" strokeWidth="4" strokeLinejoin="round" />
      </svg>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}
