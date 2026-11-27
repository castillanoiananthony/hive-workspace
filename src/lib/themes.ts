import { fit, onColor, ratio, shade, type Hex } from "./contrast";

export type PresetId = "honey" | "daylight" | "midnight" | "ember" | "moss";
export type Mode = "dark" | "light" | "system";
export type TextSize = "s" | "m" | "l" | "xl";
export type ThemeSettings = { preset: PresetId; mode: Mode; accent?: Hex | null; textSize?: TextSize };

/** Root font size per setting; every rem-based size in the app (text, spacing, controls) scales with it. */
export const TEXT_SIZES: Record<TextSize, { label: string; root: string }> = {
  s: { label: "Small", root: "100%" },
  m: { label: "Default", root: "112.5%" },
  l: { label: "Large", root: "125%" },
  xl: { label: "Extra large", root: "137.5%" },
};

type Palette = {
  label: string;
  scheme: "dark" | "light";
  bg: Hex; surface: Hex; raised: Hex; border: Hex;
  text: Hex; muted: Hex; accent: Hex;
  success: Hex; danger: Hex;
};

export const PRESETS: Record<PresetId, Palette> = {
  honey: {
    label: "Honey", scheme: "dark",
    bg: "#17171A", surface: "#1F2024", raised: "#28292E", border: "#36373D",
    text: "#EDEBE6", muted: "#A3A2AA", accent: "#F5B80B",
    success: "#7FB98A", danger: "#E8847A",
  },
  daylight: {
    label: "Daylight", scheme: "light",
    bg: "#F3F3F1", surface: "#FFFFFF", raised: "#FFFFFF", border: "#DCDBD5",
    text: "#1C1C1F", muted: "#5C5B63", accent: "#F5B80B",
    success: "#2F7A43", danger: "#B3362B",
  },
  midnight: {
    label: "Midnight", scheme: "dark",
    bg: "#0F1320", surface: "#161B2B", raised: "#1E2436", border: "#2D3449",
    text: "#E6E9F0", muted: "#A0A8BA", accent: "#F2C94C",
    success: "#7FC1A0", danger: "#EE8C8C",
  },
  ember: {
    label: "Ember", scheme: "dark",
    bg: "#1A1512", surface: "#221C18", raised: "#2C2420", border: "#3E342D",
    text: "#F1E9E1", muted: "#AFA399", accent: "#F2973A",
    success: "#93BD7E", danger: "#EF8A78",
  },
  moss: {
    label: "Moss", scheme: "dark",
    bg: "#131915", surface: "#1A211C", raised: "#222B25", border: "#334037",
    text: "#E7ECE5", muted: "#A0AC9F", accent: "#E3C33A",
    success: "#8CC59A", danger: "#E8907E",
  },
};

/**
 * Resolve settings into CSS custom properties.
 * `accent` is the fill (buttons, hex progress); `accent-text` is the same hue made readable as text on `bg`.
 */
export function themeVars(preset: PresetId, accentOverride?: string | null): Record<string, string> {
  const p = PRESETS[preset];
  const raw = accentOverride ?? p.accent;
  // Dark themes: the fill itself reaches 3:1 against the page (WCAG 1.4.11).
  // Light themes: the fill keeps its true colour and a darker `accent-edge` outline carries the 3:1.
  const base = p.scheme === "dark" ? fit(raw, p.bg, 3) : (raw.toUpperCase() as Hex);
  let accent = base;
  // mid-tone picks can fail with both inks; nudge until the button label reads at 4.5:1
  for (let t = 0.05; ratio(onColor(accent), accent) < 4.5 && t <= 1; t += 0.05)
    accent = shade(base, p.scheme === "dark" ? t : -t);
  const ink = onColor(accent);
  return {
    "--bg": p.bg, "--surface": p.surface, "--surface-raised": p.raised, "--border": p.border,
    "--text": p.text, "--text-muted": p.muted,
    "--accent": accent,
    "--accent-edge": ratio(accent, p.bg) >= 3 ? accent : fit(accent, p.bg, 3),
    // hover moves away from the label colour so the label stays readable
    "--accent-hover": shade(accent, ink === "#FFFFFF" ? -0.15 : 0.2),
    "--accent-deep": shade(accent, -0.2),
    "--on-accent": ink,
    // readable on both the page background and panels
    "--accent-text": fit(fit(raw, p.surface, 4.5), p.bg, 4.5),
    "--success": p.success, "--danger": p.danger,
    "color-scheme": p.scheme,
  };
}

/** Which preset is shown for a mode: "light" forces Daylight, "dark" keeps a dark preset. */
export function presetFor(s: ThemeSettings, systemDark: boolean): PresetId {
  const wantDark = s.mode === "system" ? systemDark : s.mode === "dark";
  const isDark = PRESETS[s.preset].scheme === "dark";
  if (wantDark === isDark) return s.preset;
  return wantDark ? "honey" : "daylight";
}

export const DEFAULT_THEME: ThemeSettings = { preset: "honey", mode: "dark", accent: null, textSize: "m" };
