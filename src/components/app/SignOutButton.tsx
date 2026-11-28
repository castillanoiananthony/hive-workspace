"use client";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(app)/actions";
import { BusyOverlay } from "./BusyOverlay";
import { wipe } from "@/lib/offline-store";

function Inner({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (<><button disabled={pending} className={className}>Sign out</button><BusyOverlay show={pending} label="Signing you out…" /></>);
}

export function SignOutButton({ className }: { className: string }) {
  // nothing of yours stays on this device: the offline copy and cached pages go first
  return <form action={async () => { await wipe(); navigator.serviceWorker?.controller?.postMessage("clear"); await signOut(); }}><Inner className={className} /></form>;
}
