"use client";
import { useEffect, useState, useTransition } from "react";
import { HexProgress } from "@/components/brand/HexProgress";
import { applyTheme } from "@/lib/apply-theme";
import { PRESETS, TEXT_SIZES, type Mode, type PresetId, type TextSize, type ThemeSettings } from "@/lib/themes";
import { saveTheme } from "../actions";

const MODES: { id: Mode; label: string }[] = [
  { id: "dark", label: "Dark" }, { id: "light", label: "Light" }, { id: "system", label: "Follow my device" },
];

export function Appearance({ initial }: { initial: ThemeSettings }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [, start] = useTransition();

  // the database copy wins on a new device; also re-applies when the device switches light/dark
  useEffect(() => {
    applyTheme(s);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => s.mode === "system" && applyTheme(s);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [s]);

  function update(next: Partial<ThemeSettings>) {
    const merged = { ...s, ...next };
    setS(merged);
    setSaved(false);
    start(async () => { await saveTheme(merged); setSaved(true); });
  }

  const radio = "min-h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-medium aria-checked:border-accent-edge aria-checked:bg-raised";
  return (
    <section aria-labelledby="appearance">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="appearance" className="font-display text-xl font-semibold">Appearance</h2>
        <p className="text-sm text-muted" aria-live="polite">{saved ? "Saved" : "Saving…"}</p>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 font-medium">Theme</legend>
        <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
          {(Object.keys(PRESETS) as PresetId[]).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={s.preset === id} onClick={() => update({ preset: id, mode: PRESETS[id].scheme })} className={radio}>
              <span className="mr-2 inline-block size-3 rounded-full align-middle" style={{ background: PRESETS[id].accent, outline: `3px solid ${PRESETS[id].bg}` }} aria-hidden />
              {PRESETS[id].label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 font-medium">Text size</legend>
        <div role="radiogroup" aria-label="Text size" className="flex flex-wrap gap-2">
          {(Object.keys(TEXT_SIZES) as TextSize[]).map((id, i) => (
            <button key={id} type="button" role="radio" aria-checked={(s.textSize ?? "m") === id} onClick={() => update({ textSize: id })} className={radio}>
              <span aria-hidden className="mr-2 font-display font-semibold" style={{ fontSize: `${0.85 + i * 0.15}em` }}>Aa</span>
              {TEXT_SIZES[id].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">Makes all text, buttons and spacing bigger or smaller on every page.</p>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 font-medium">Light or dark</legend>
        <div role="radiogroup" aria-label="Light or dark" className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={s.mode === m.id} onClick={() => update({ mode: m.id })} className={radio}>{m.label}</button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex min-h-11 items-center gap-3 font-medium">
          Accent colour
          <input type="color" value={s.accent ?? PRESETS[s.preset].accent} onChange={(e) => update({ accent: e.target.value as ThemeSettings["accent"] })} className="h-10 w-14 cursor-pointer rounded border border-line bg-transparent" />
        </label>
        {s.accent && <button type="button" onClick={() => update({ accent: null })} className="min-h-11 rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 text-sm text-accent-text">Use the theme&apos;s colour</button>}
        <HexProgress value={68} size={40} label="Preview of goal progress" />
      </div>
      <p className="mt-3 text-sm text-muted">Any colour works: HIVE-WORKSPACE adjusts it so text and buttons stay easy to read.</p>
    </section>
  );
}
