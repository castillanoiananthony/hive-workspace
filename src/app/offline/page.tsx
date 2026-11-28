import type { Metadata } from "next";
import { OfflineTasks } from "./OfflineTasks";

export const metadata: Metadata = { title: "Your tasks (offline)", robots: { index: false, follow: false } };

// A static page (no server data) that the service worker keeps on the device. It reads your saved tasks from this device.
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <OfflineTasks />
    </main>
  );
}
