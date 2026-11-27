import { Logo } from "@/components/brand/Logo";

/** Frame for pages teammates reach from email (no account, no sidebar). */
export function PublicCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      <div aria-hidden className="honeycomb honeycomb-layer" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size={28} /></div>
        <div className="rounded-[var(--radius)] border border-line bg-surface p-6 text-center sm:p-8">{children}</div>
      </div>
    </main>
  );
}
