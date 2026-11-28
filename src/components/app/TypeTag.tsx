const TYPES = { bug: { label: "Bug", icon: "🐞", color: "#E5484D" }, feature: { label: "Feature", icon: "✨", color: "#4C8DF6" }, decision: { label: "Decision", icon: "⚖", color: "#8B5CF6" } } as const;

/** Bug / Feature / Decision label for team tasks (plain tasks show nothing). The word carries the meaning, not the colour. */
export function TypeTag({ type, className = "" }: { type?: string | null; className?: string }) {
  const t = TYPES[type as keyof typeof TYPES];
  if (!t) return null;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`} style={{ borderColor: t.color }}><span aria-hidden>{t.icon}</span>{t.label}</span>;
}
