"use client";
import { useState } from "react";
import { PRESETS, themeVars, type PresetId } from "@/lib/themes";
import { HexProgress } from "@/components/brand/HexProgress";

// Brand-review helper only: swaps the theme on <html> so the mascot and logo can be checked in every preset.
export function ThemePreview() {
  const [preset, setPreset] = useState<PresetId>("honey");
  const [accent, setAccent] = useState<string | null>(null);
  const [value, setValue] = useState(62);
  function apply(p: PresetId, a: string | null) {
    setPreset(p); setAccent(a);
    const vars = themeVars(p, a);
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  }
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <fieldset>
        <legend className="mb-2 text-sm text-muted">Theme</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESETS) as PresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={preset === id}
              onClick={() => apply(id, accent)}
              className="min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium aria-pressed:border-accent aria-pressed:bg-raised"
            >
              {PRESETS[id].label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
        Custom accent
        <input type="color" value={accent ?? PRESETS[preset].accent} onChange={(e) => apply(preset, e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-line bg-transparent" />
      </label>
      {accent && (
        <button type="button" onClick={() => apply(preset, null)} className="min-h-11 rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm text-accent-text">
          Reset accent
        </button>
      )}
      <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
        Progress
        <input type="range" min={0} max={100} value={value} onChange={(e) => setValue(+e.target.value)} className="accent-[var(--accent)]" />
        <HexProgress value={value} size={40} label="Sample goal progress" />
      </label>
    </div>
  );
}
