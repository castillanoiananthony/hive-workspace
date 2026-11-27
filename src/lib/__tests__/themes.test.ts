import { describe, expect, it } from "vitest";
import { ratio } from "../contrast";
import { PRESETS, themeVars, type PresetId } from "../themes";

function check(preset: PresetId, accent?: string) {
  const v = themeVars(preset, accent);
  return {
    text: ratio(v["--text"], v["--surface"]),
    textOnBg: ratio(v["--text"], v["--bg"]),
    muted: ratio(v["--text-muted"], v["--surface"]),
    accentText: ratio(v["--accent-text"], v["--surface"]),
    onAccent: ratio(v["--on-accent"], v["--accent"]),
    onAccentHover: ratio(v["--on-accent"], v["--accent-hover"]),
    accentFill: ratio(v["--accent-edge"], v["--bg"]),
    danger: ratio(PRESETS[preset].danger, v["--surface"]),
    success: ratio(PRESETS[preset].success, v["--surface"]),
  };
}

function assertAA(r: ReturnType<typeof check>, label: string) {
  for (const k of ["text", "textOnBg", "muted", "accentText", "onAccent", "danger", "success"] as const)
    expect(r[k], `${label} ${k}`).toBeGreaterThanOrEqual(4.5);
  expect(r.onAccentHover, `${label} onAccentHover`).toBeGreaterThanOrEqual(4.5);
  expect(r.accentFill, `${label} accentFill`).toBeGreaterThanOrEqual(3);
}

describe("themes meet WCAG AA", () => {
  for (const id of Object.keys(PRESETS) as PresetId[]) {
    it(`${id} preset`, () => assertAA(check(id), id));
    it(`${id} with any custom accent`, () => {
      // sweep hue × lightness, including near-black and near-white picks
      for (let h = 0; h < 360; h += 30)
        for (const l of [10, 30, 50, 70, 90]) {
          const accent = hsl(h, 80, l);
          assertAA(check(id, accent), `${id} ${accent}`);
        }
    });
  }
});

function hsl(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return "#" + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
