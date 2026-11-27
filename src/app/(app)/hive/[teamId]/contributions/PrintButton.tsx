"use client";
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">Print or save as PDF</button>;
}
