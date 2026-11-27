import { presetFor, themeVars, type ThemeSettings } from "./themes";

export const THEME_KEY = "hive-theme";

/** Apply a theme to <html> now and remember it so the next page load paints it before first frame. */
export function applyTheme(s: ThemeSettings) {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const vars = themeVars(presetFor(s, dark), s.accent);
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  localStorage.setItem(THEME_KEY, JSON.stringify({ settings: s, vars }));
}
