"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** A centred window over a blurred page. Esc, the ✕ button or a click outside closes it. */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby="modal-title" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className={`modal m-auto max-h-[calc(100dvh-2rem)] ${wide ? "w-[min(40rem,calc(100%-2rem))]" : "w-[min(30rem,calc(100%-2rem))]"} overflow-x-hidden overflow-y-auto rounded-[calc(var(--radius)*2)] border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm`}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-6 py-4">
        <h2 id="modal-title" className="font-display text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-full border border-line text-muted hover:border-accent-edge hover:text-ink">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="p-6">{open && children}</div>
    </dialog>
  );
}
