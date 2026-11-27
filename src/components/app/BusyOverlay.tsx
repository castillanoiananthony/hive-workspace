"use client";
import { createPortal } from "react-dom";
import { HoneyLoader } from "./HoneyLoader";

/** Full-screen "please wait" for actions that take a moment (signing out, uploading, saving). Blocks double taps. */
export function BusyOverlay({ show, label }: { show: boolean; label: string }) {
  if (!show || typeof document === "undefined") return null;
  return createPortal(
    <div className="busy-overlay fixed inset-0 z-[100] grid place-items-center bg-bg/60 backdrop-blur-md">
      <div className="rounded-[calc(var(--radius)*2)] border border-line bg-surface/90 px-10 py-6 shadow-2xl">
        <HoneyLoader label={label} inline={false} size={64} />
      </div>
    </div>,
    document.body,
  );
}
