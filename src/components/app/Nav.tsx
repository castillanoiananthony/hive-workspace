"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { hexPoints } from "@/components/brand/Bee";

const ITEMS = [
  { href: "/cell", label: "My Cell", icon: "cell" },
  { href: "/hive", label: "The Hive", icon: "hive" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

function Icon({ name }: { name: (typeof ITEMS)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      {name === "cell" && <polygon points={hexPoints(12, 12, 9)} {...common} />}
      {name === "hive" && (
        <g {...common}>
          <polygon points={hexPoints(8, 15, 5)} /><polygon points={hexPoints(16.6, 15, 5)} /><polygon points={hexPoints(12.3, 7.5, 5)} />
        </g>
      )}
      {name === "calendar" && <g {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></g>}
      {name === "settings" && <g {...common}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></g>}
    </svg>
  );
}

export const Sidebar = () => <SidebarView path={usePathname()} />;
export const BottomNav = () => <BottomNavView path={usePathname()} />;

// Views take the path as a prop so the layout can show them (with nothing highlighted) while the path is unknown.
export function SidebarView({ path }: { path: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <Link href="/cell" className="mb-8 px-3"><Logo size={24} /></Link>
      <nav aria-label="Main" className="grid gap-1">
        {ITEMS.map((i) => {
          const active = path.startsWith(i.href);
          return (
            <Link
              key={i.href} href={i.href} aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[var(--radius)] px-3 font-medium ${active ? "bg-raised text-ink" : "text-muted hover:bg-raised hover:text-ink"}`}
            >
              <span className={active ? "text-accent-edge" : undefined}><Icon name={i.icon} /></span>
              {i.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/developer" className="mt-auto px-3 text-sm text-muted hover:text-ink">Meet the developer</Link>
    </aside>
  );
}

export function BottomNavView({ path }: { path: string }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITEMS.map((i) => {
        const active = path.startsWith(i.href);
        return (
          <Link
            key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${active ? "text-ink" : "text-muted"}`}
          >
            <span className={active ? "text-accent-edge" : undefined}><Icon name={i.icon} /></span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
