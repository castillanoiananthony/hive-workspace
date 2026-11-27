import { importanceOf, type ImportanceColors } from "@/lib/importance";

/** A coloured dot plus the word, so the meaning never rests on colour alone. */
export function ImportanceTag({ level, colors, className = "" }: { level: number | null | undefined; colors?: ImportanceColors | null; className?: string }) {
  const i = importanceOf(level, colors);
  if (!i) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`} style={{ borderColor: i.color, color: "var(--ink)" }}>
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: i.color }} />{i.label}<span className="sr-only"> importance</span>
    </span>
  );
}
