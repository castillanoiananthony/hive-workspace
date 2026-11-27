"use client";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(app)/actions";
import { BusyOverlay } from "./BusyOverlay";

function Inner({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (<><button disabled={pending} className={className}>Sign out</button><BusyOverlay show={pending} label="Signing you out…" /></>);
}

export function SignOutButton({ className }: { className: string }) {
  return <form action={signOut}><Inner className={className} /></form>;
}
