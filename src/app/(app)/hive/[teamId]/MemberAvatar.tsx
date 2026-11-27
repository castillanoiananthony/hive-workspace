import { HexBadge } from "@/components/app/HexBadge";
import { nameOf, type MemberT } from "./types";

// pointy-top hexagon, matching hexPoints in the Bee
const HEX = "polygon(50% 2.5%, 91.1% 26.25%, 91.1% 73.75%, 50% 97.5%, 8.9% 73.75%, 8.9% 26.25%)";

/** A member as a hexagon: their profile picture clipped to a hex with a team-colour edge, or their initials. */
export function MemberAvatar({ m, color, size = 40 }: { m: MemberT; color: string; size?: number }) {
  if (!m.avatar) return <HexBadge label={nameOf(m)} color={color} size={size} />;
  const edge = Math.max(2, Math.round(size / 20));
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: size, height: size, clipPath: HEX, background: color }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny, already resized by our image route */}
      <img src={m.avatar} alt="" width={size} height={size} className="bg-raised object-cover" style={{ width: size - edge * 2, height: size - edge * 2, clipPath: HEX }} />
    </span>
  );
}
