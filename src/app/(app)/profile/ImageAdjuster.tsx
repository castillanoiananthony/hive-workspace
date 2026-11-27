"use client";
import { useEffect, useRef, useState } from "react";

const OUT = { avatar: { w: 800, h: 800 }, banner: { w: 1600, h: 480 } } as const;

/**
 * Drag to reposition, slider (or arrow keys / + -) to zoom, then crop in the browser to the exact size we store.
 * The server still decodes and re-encodes whatever arrives.
 */
export function ImageAdjuster({ kind, src, onCancel, onSave }: { kind: "avatar" | "banner"; src: string; onCancel: () => void; onSave: (file: File) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [frameW, setFrameW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const aspect = OUT[kind].h / OUT[kind].w;
  const frameH = frameW * aspect;

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  useEffect(() => {
    const measure = () => setFrameW(frame.current?.clientWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [img]);

  // the smallest scale that still covers the whole frame, times the user's zoom
  const scale = img && frameW ? Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight) * zoom : 1;
  const dispW = img ? img.naturalWidth * scale : 0;
  const dispH = img ? img.naturalHeight * scale : 0;
  const clamp = (p: { x: number; y: number }) => ({ x: Math.min(0, Math.max(frameW - dispW, p.x)), y: Math.min(0, Math.max(frameH - dispH, p.y)) });

  // start centred, and keep the image covering the frame whenever zoom or size changes
  const centred = useRef(false);
  useEffect(() => {
    if (!img || !frameW) return;
    const t = setTimeout(() => setPos((p) => (centred.current ? clamp(p) : (centred.current = true, { x: (frameW - dispW) / 2, y: (frameH - dispH) / 2 }))));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clamp depends on these values only
  }, [img, frameW, zoom]);

  function save() {
    if (!img) return;
    const { w, h } = OUT[kind];
    const r = w / frameW;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(img, pos.x * r, pos.y * r, dispW * r, dispH * r);
    c.toBlob((b) => b && onSave(new File([b], `${kind}.jpg`, { type: "image/jpeg" })), "image/jpeg", 0.92);
  }

  function onKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) { e.preventDefault(); setPos((p) => clamp({ x: p.x + moves[e.key][0], y: p.y + moves[e.key][1] })); }
    if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, z + 0.1));
    if (e.key === "-") setZoom((z) => Math.max(1, z - 0.1));
  }

  return (
    <dialog ref={dialog} onClose={onCancel} aria-labelledby="adjust-h" className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(44rem,calc(100%-1.5rem))] overflow-y-auto rounded-[var(--radius)] border border-line bg-raised p-0 text-ink backdrop:bg-black/70">
      <div className="grid gap-4 p-5 sm:p-6">
        <h2 id="adjust-h" className="font-display text-xl font-semibold">{kind === "avatar" ? "Adjust your profile picture" : "Adjust your banner"}</h2>
        <p className="text-sm text-muted">Drag the picture to move it. Use the slider to zoom. With a keyboard: arrow keys move it, + and − zoom.</p>
        <div
          ref={frame}
          tabIndex={0}
          role="application"
          aria-label="Picture position. Use arrow keys to move and plus or minus to zoom."
          onKeyDown={onKey}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
          onPointerMove={(e) => { const d = drag.current; if (d) setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y })); }}
          onPointerUp={() => { drag.current = null; }}
          className={`relative w-full cursor-grab touch-none overflow-hidden rounded-[var(--radius)] bg-bg select-none active:cursor-grabbing ${kind === "avatar" ? "mx-auto max-w-[min(100%,24rem,calc(100dvh-20rem))]" : ""}`}
          style={{ height: frameH || undefined, aspectRatio: frameH ? undefined : `${OUT[kind].w} / ${OUT[kind].h}` }}
        >
          {img && frameW > 0 && (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the user's own file
            <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: pos.x, top: pos.y, width: dispW, height: dispH }} />
          )}
          {/* the round mask shows what the profile picture will look like */}
          {kind === "avatar" && frameW > 0 && <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />}
        </div>
        <label className="flex items-center gap-3">
          <span className="text-sm font-medium">Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="flex-1 accent-[var(--accent)]" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 px-4 text-muted hover:text-ink">Cancel</button>
          <button type="button" disabled={!img} onClick={save} className="min-h-11 rounded-[var(--radius)] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60">Save</button>
        </div>
      </div>
    </dialog>
  );
}
