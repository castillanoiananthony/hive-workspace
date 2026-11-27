"use client";
import { createPortal } from "react-dom";
import { HoneyLoader } from "./HoneyLoader";

/** Full-screen "please wait" for actions that take a moment (signing out, uploading, saving). Blocks double taps. */
export function BusyOverlay({ show, label }: { show: boolean; label: string }) {
  if (!show || typeof document === "undefined") return null;
  return createPortal(
    <div className="busy-overlay fixed inset-0 z-[100] grid place-items-center bg-bg/75 backdrop-blur-xl [&_[role=status]>span]:text-base [&_[role=status]>span]:font-medium [&_[role=status]>span]:text-ink">
      <HoneyLoader label={label} inline={false} size={72} />
    </div>,
    document.body,
  );
}
