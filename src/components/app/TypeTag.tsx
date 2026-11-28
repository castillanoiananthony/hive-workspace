const TYPES = { bug: { label: "Bug", color: "#E5484D" }, feature: { label: "Feature", color: "#4C8DF6" }, decision: { label: "Decision", color: "#8B5CF6" } } as const;

/** Bug / Feature / Decision label for team tasks (plain tasks show nothing). The word carries the meaning, not the colour. */
export function TypeTag({ type, className = "" }: { type?: string | null; className?: string }) {
  const t = TYPES[type as keyof typeof TYPES];
  if (!t) return null;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}><span aria-hidden className="size-2 rounded-full" style={{ background: t.color }} />{t.label}</span>;
}
