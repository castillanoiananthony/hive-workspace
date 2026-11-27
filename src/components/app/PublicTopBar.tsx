import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BackButton } from "./BackButton";

/** Header for pages outside the app (developer, privacy, terms): logo on the left, Back on the right, pinned to the top. */
export function PublicTopBar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-line/60 bg-bg/75 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/home" className="inline-flex min-h-12 items-center" aria-label="HIVE-WORKSPACE home"><Logo size={40} /></Link>
        <BackButton className="" />
      </div>
    </header>
  );
}
