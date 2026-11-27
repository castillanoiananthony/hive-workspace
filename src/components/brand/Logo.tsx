import { hexPoints } from "./Bee";

// Mark: three cells, one filled with honey — the brand's "progress you can see" idea in its smallest form.
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  const r = 9;
  const w = Math.sqrt(3) * r; // pointy-top cell width
  const cells = [
    { cx: 16 - w / 2 - 0.6, cy: 22, filled: false },
    { cx: 16 + w / 2 + 0.6, cy: 22, filled: false },
    { cx: 16, cy: 22 - 1.5 * r - 1, filled: true },
  ];
  return (
    <svg viewBox="-1 -2 34 34" width={size} height={size} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {cells.map((c, i) => (
        <polygon
          key={i}
          points={hexPoints(c.cx, c.cy, r - 1)}
          fill={c.filled ? "var(--accent)" : "none"}
          stroke={c.filled ? "var(--accent-edge)" : "var(--text)"}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5" role="img" aria-label="HIVE-WORKSPACE">
      <LogoMark size={size} />
      <span className="font-display font-semibold tracking-[0.01em] text-[var(--text)]" style={{ fontSize: `${(size * 0.62) / 16}rem` }} /* rem so it follows the text size setting */ aria-hidden>
        HIVE<span className="text-[var(--text-muted)]">-</span>WORKSPACE
      </span>
    </span>
  );
}
