// WCAG 2.1 contrast helpers used to keep every theme and custom accent at AA.

export type Hex = `#${string}`;

const DARK_INK = "#17171A" as Hex;
const LIGHT_INK = "#FFFFFF" as Hex;

export function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: number[]): Hex {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour for labels sitting on an accent-filled button: dark ink unless white reads better. */
export function onColor(fill: string): Hex {
  return ratio(fill, DARK_INK) >= ratio(fill, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}

/**
 * Lighten (amount > 0) or darken (amount < 0), -1..1, by moving HSL lightness.
 * Hue and saturation stay put, so a darker honey is a rich amber rather than a muddy brown.
 */
export function shade(hex: string, amount: number): Hex {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  l = amount > 0 ? l + (1 - l) * amount : l * (1 + amount);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r1, g1, b1] = h < 0 ? [c, 0, x] : h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([r1, g1, b1].map((v) => (v + m) * 255));
}

/**
 * Nudge a colour lighter or darker until it reaches `min` contrast against `bg`.
 * Moves away from the background's lightness, so dark themes lighten and light themes darken.
 */
export function fit(color: string, bg: string, min: number): Hex {
  const dir = luminance(bg) < 0.2 ? 1 : -1;
  for (let step = 0; step <= 20; step++) {
    const c = shade(color, (dir * step) / 20);
    if (ratio(c, bg) >= min) return c;
  }
  return dir > 0 ? LIGHT_INK : DARK_INK;
}
