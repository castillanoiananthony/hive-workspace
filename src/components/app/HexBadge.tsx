import { hexPoints } from "@/components/brand/Bee";
import { onColor } from "@/lib/contrast";

/** Hexagon badge for a team or member: their colour with initials in readable ink. */
export function HexBadge({ label, color, size = 40, title }: { label: string; color: string; size?: number; title?: string }) {
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} className="shrink-0">
      <polygon points={hexPoints(20, 20, 19)} fill={color} />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill={onColor(color)} fontFamily="var(--font-sans)">{initials}</text>
    </svg>
  );
}
