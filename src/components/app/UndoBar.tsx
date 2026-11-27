"use client";
import { useEffect } from "react";

export type Undo = { message: string; undo: () => void } | null;

/** Bottom notice after a destructive action, with an Undo button. Clears itself after 8 seconds. */
export function UndoBar({ value, onClose }: { value: Undo; onClose: () => void }) {
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [value, onClose]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
      {value && (
        <div className="pointer-events-auto flex items-center gap-4 rounded-[var(--radius)] border border-line bg-raised px-4 py-2 shadow-lg">
          <span>{value.message}</span>
          <button type="button" onClick={() => { value.undo(); onClose(); }} className="min-h-11 rounded-[var(--radius)] border border-accent-edge/70 hover:bg-accent/10 px-3 font-semibold text-accent-text">Undo</button>
        </div>
      )}
    </div>
  );
}
