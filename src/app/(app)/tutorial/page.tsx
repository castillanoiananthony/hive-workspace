import type { Metadata } from "next";
import { Tutorial } from "./Tutorial";
import { BackButton } from "@/components/app/BackButton";

export const metadata: Metadata = { title: "Tutorial" };

export default function TutorialPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <BackButton fallback="/home" />
      <Tutorial />
    </main>
  );
}
