// How important a task is. 0 = not set. Teams can recolour the levels in Team settings.
export const IMPORTANCE = [
  { v: 1, label: "Low", color: "#3FB27F" },
  { v: 2, label: "Medium", color: "#4C8DF6" },
  { v: 3, label: "High", color: "#E5484D" },
] as const;
export type ImportanceColors = Partial<Record<"1" | "2" | "3", string>>;

export function importanceOf(v: number | null | undefined, colors?: ImportanceColors | null) {
  const l = IMPORTANCE.find((x) => x.v === v);
  return l ? { label: l.label, color: colors?.[String(l.v) as "1"] ?? l.color } : null;
}

/** Keeps only #rrggbb colours for the three levels. */
export function cleanImportanceColors(c: unknown): ImportanceColors {
  const out: ImportanceColors = {};
  if (c && typeof c === "object") for (const k of ["1", "2", "3"] as const) { const v = (c as Record<string, unknown>)[k]; if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) out[k] = v; }
  return out;
}
