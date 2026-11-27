// The HIVE-WORKSPACE bee: one geometric base (round body, big round head joined to it, two wings) posed by small changes.
// Colours come from theme variables so it follows the user's accent.

export type BeePose = "idle" | "wave" | "sleep" | "celebrate" | "fly";

type Props = { pose?: BeePose; size?: number; title?: string; animate?: boolean; className?: string; face?: string };

const BODY = { cx: 60, cy: 76, r: 22 };
const HEAD = { cx: 60, cy: 46, r: 15 }; // overlaps the body so the two read as one shape

// Per-pose tweaks: whole-body tilt, each wing's angle, and the face.
const POSES: Record<BeePose, { tilt: number; left: number; right: number; eyes: "open" | "closed" | "happy" }> = {
  idle: { tilt: 0, left: -28, right: 28, eyes: "open" },
  wave: { tilt: -6, left: -28, right: 62, eyes: "happy" },
  sleep: { tilt: 8, left: -8, right: 8, eyes: "closed" },
  celebrate: { tilt: 0, left: -58, right: 58, eyes: "happy" },
  fly: { tilt: 18, left: -40, right: 40, eyes: "open" },
};

export function Bee({ pose = "idle", size = 120, title, animate = false, className, face }: Props) {
  const p = POSES[pose];
  // a photo needs room: bigger head, antennae lifted to its new crown
  const head = face ? { cx: 60, cy: 40, r: 23 } : HEAD;
  const lift = face ? -11 : 0;
  const flutter = animate && pose !== "sleep";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={[className, animate ? "bee-float" : ""].join(" ")}
      style={{ overflow: "visible" }}
    >
      <g transform={`rotate(${p.tilt} 60 68)`}>
        {/* wings sit behind the body, hinged at the shoulders */}
        {[{ x: 44, a: p.left, cls: "bee-wing-l" }, { x: 76, a: p.right, cls: "bee-wing-r" }].map((w) => (
          <g key={w.cls} transform={`rotate(${w.a} ${w.x} 62)`}>
            <path
              className={flutter ? w.cls : undefined}
              style={{ transformOrigin: `${w.x}px 62px` }}
              d={`M${w.x} 62 C ${w.x - 14} 54, ${w.x - 13} 30, ${w.x} 28 C ${w.x + 13} 30, ${w.x + 14} 54, ${w.x} 62 Z`}
              fill="var(--text)"
              fillOpacity="0.14"
              stroke="var(--text)"
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {/* antennae */}
        <g transform={`translate(0 ${lift})`}>
        <path d="M53 34 L46 19" stroke="var(--accent-edge)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M67 34 L74 19" stroke="var(--accent-edge)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <circle cx="46" cy="18" r="2.8" fill="var(--accent-edge)" />
        <circle cx="74" cy="18" r="2.8" fill="var(--accent-edge)" />
        </g>

        {/* round body with two ink stripes */}
        <clipPath id={`bee-body-${pose}`}>
          <circle {...BODY} />
        </clipPath>
        <circle {...BODY} fill="var(--accent)" stroke="var(--accent-edge)" strokeWidth="1.5" />
        <g clipPath={`url(#bee-body-${pose})`} fill="var(--on-accent)">
          <rect x="34" y="72" width="52" height="6" />
          <rect x="34" y="84" width="52" height="6" />
        </g>

        {/* big head sitting on the body; the ink ring marks the neck without a gap */}
        {face ? (
          // a photo in place of the face, cropped to the head circle
          <>
            <clipPath id={`bee-head-${pose}`}>
              <circle {...head} />
            </clipPath>
            <image href={face} x={head.cx - head.r} y={head.cy - head.r} width={head.r * 2} height={head.r * 2} clipPath={`url(#bee-head-${pose})`} preserveAspectRatio="xMidYMid slice" />
            <circle {...head} fill="none" stroke="var(--accent)" strokeWidth="2" />
          </>
        ) : (
          <>
            <circle {...HEAD} fill="var(--accent)" stroke="var(--on-accent)" strokeWidth="2" />
            <Face kind={p.eyes} />
          </>
        )}
      </g>

      {pose === "sleep" && (
        <g fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinejoin="round">
          <Hexlet cx={88} cy={30} r={4} />
          <Hexlet cx={98} cy={18} r={3} />
        </g>
      )}
      {pose === "celebrate" && (
        <g fill="var(--accent)">
          <Hexlet cx={22} cy={34} r={3.5} />
          <Hexlet cx={98} cy={30} r={3} />
          <Hexlet cx={30} cy={90} r={2.5} />
          <Hexlet cx={92} cy={92} r={3.5} />
        </g>
      )}
      {pose === "fly" && (
        <g stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
          <path d="M14 70 H30" />
          <path d="M8 80 H26" />
          <path d="M18 90 H32" />
        </g>
      )}
    </svg>
  );
}

function Face({ kind }: { kind: "open" | "closed" | "happy" }) {
  const ink = "var(--on-accent)";
  if (kind === "open")
    return (
      <g fill={ink}>
        <circle cx="54.5" cy="46" r="2.4" />
        <circle cx="65.5" cy="46" r="2.4" />
      </g>
    );
  // closed: flat lines; happy: small upward arcs
  const d = kind === "closed" ? ["M51.5 47 H57.5", "M62.5 47 H68.5"] : ["M51.5 47 Q54.5 43.5 57.5 47", "M62.5 47 Q65.5 43.5 68.5 47"];
  return (
    <g stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none">
      {d.map((x) => <path key={x} d={x} />)}
    </g>
  );
}

export function Hexlet({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <polygon points={hexPoints(cx, cy, r)} />;
}

/** Pointy-top hexagon corner list for SVG `points`. */
export function hexPoints(cx: number, cy: number, r: number, flat = false) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + (flat ? 0 : Math.PI / 6);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}
