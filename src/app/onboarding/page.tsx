import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { Wizard } from "./Wizard";

export const metadata: Metadata = { title: "Welcome" };

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10">
      <div aria-hidden className="honeycomb honeycomb-layer" />
      <div className="relative mx-auto max-w-lg">
        <Suspense fallback={null}>
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}

async function Gate() {
  const me = await requireUser();
  if (me.onboardedAt) redirect("/home");
  return <Wizard firstName={me.name.split(" ")[0] || ""} />;
}
