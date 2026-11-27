import { hexPoints } from "@/components/brand/Bee";
import { HexBadge } from "@/components/app/HexBadge";
import { nameOf, type MemberT } from "./types";

/** A member as a hexagon: their profile picture clipped to a hex, or their initials. */
export function MemberAvatar({ m, color, size = 40 }: { m: MemberT; color: string; size?: number }) {
  if (!m.avatar) return <HexBadge label={nameOf(m)} color={color} size={size} />;
  const id = `hexclip-${m.id}`;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="shrink-0">
      <defs><clipPath id={id}><polygon points={hexPoints(20, 20, 19)} /></clipPath></defs>
      <image href={m.avatar} x="0" y="0" width="40" height="40" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
      <polygon points={hexPoints(20, 20, 19)} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
