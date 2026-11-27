"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HexBadge } from "@/components/app/HexBadge";
import { hexPoints } from "@/components/brand/Bee";
import { Logo } from "@/components/brand/Logo";

type IconName = "home" | "cell" | "hive" | "calendar" | "settings" | "learn" | "me";
type Item = { href: string; label: string; icon: IconName; hint: string };

// Main places, in the order people use them; "Learn" and settings sit apart so the first three stay obvious.
const MAIN: Item[] = [
  { href: "/home", label: "Home", icon: "home", hint: "Your feed and what's coming up" },
  { href: "/cell", label: "My Cell", icon: "cell", hint: "Your goals and tasks" },
  { href: "/hive", label: "The Hive", icon: "hive", hint: "Your teams" },
  { href: "/calendar", label: "Calendar", icon: "calendar", hint: "Everything with a due date" },
];
const MORE: Item[] = [
  { href: "/tutorial", label: "Tutorial", icon: "learn", hint: "How everything works" },
  { href: "/settings", label: "Settings", icon: "settings", hint: "Theme, text size, calendar link" },
];
const MOBILE: Item[] = [...MAIN, { href: "/settings", label: "Settings", icon: "settings", hint: "" }, { href: "/profile", label: "Me", icon: "me", hint: "" }]; // Tutorial and Meet the developer live under Me

export type Me = { name: string; email: string; avatar: string | null };

function Icon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      {name === "home" && <g {...common}><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></g>}
      {name === "cell" && <polygon points={hexPoints(12, 12, 9)} {...common} />}
      {name === "hive" && (
        <g {...common}>
          <polygon points={hexPoints(8, 15, 5)} /><polygon points={hexPoints(16.6, 15, 5)} /><polygon points={hexPoints(12.3, 7.5, 5)} />
        </g>
      )}
      {name === "calendar" && <g {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></g>}
      {name === "settings" && <g {...common}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></g>}
      {name === "learn" && <g {...common}><path d="M3 9l9-5 9 5-9 5-9-5Z" /><path d="M7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" /></g>}
      {name === "me" && <g {...common}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></g>}
    </svg>
  );
}

const active = (path: string, href: string) => path === href || path.startsWith(href + "/");

function NavLink({ item, path }: { item: Item; path: string }) {
  const on = active(path, item.href);
  return (
    <Link href={item.href} aria-current={on ? "page" : undefined} title={item.hint}
      className={`flex min-h-11 items-center gap-3 rounded-[var(--radius)] px-3 font-medium ${on ? "bg-raised text-ink" : "text-muted hover:bg-raised hover:text-ink"}`}>
      <span className={on ? "text-accent-edge" : undefined}><Icon name={item.icon} /></span>
      {item.label}
    </Link>
  );
}

export function Avatar({ me, size }: { me: Me; size: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- private, pre-sized image from our own route
  return me.avatar ? <img src={me.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    : <HexBadge label={me.name || me.email} color="#F5B80B" size={size} />;
}

export const Sidebar = ({ me }: { me: Me | null }) => <SidebarView path={usePathname()} me={me} />;
export const BottomNav = ({ me }: { me: Me | null }) => <BottomNavView path={usePathname()} me={me} />;

// Views take the path as a prop so the layout can show them (with nothing highlighted) while the path is unknown.
export function SidebarView({ path, me }: { path: string; me: Me | null }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <Link href="/home" className="mb-8 px-3 whitespace-nowrap"><Logo size={26} /></Link>
      <nav aria-label="Main" className="grid gap-1">{MAIN.map((i) => <NavLink key={i.href} item={i} path={path} />)}</nav>
      <nav aria-label="Help and settings" className="mt-6 grid gap-1 border-t border-line pt-6">{MORE.map((i) => <NavLink key={i.href} item={i} path={path} />)}</nav>
      <div className="mt-auto grid gap-2">
        {me && (
          <Link href="/profile" aria-current={active(path, "/profile") ? "page" : undefined}
            className={`flex min-h-14 items-center gap-3 rounded-[var(--radius)] px-3 py-2 ${active(path, "/profile") ? "bg-raised" : "hover:bg-raised"}`}>
            <Avatar me={me} size={36} />
            <span className="min-w-0"><span className="block truncate font-medium">{me.name || "Your profile"}</span><span className="block text-sm text-muted">View profile</span></span>
          </Link>
        )}
        <Link href="/developer" className="px-3 text-sm text-muted hover:text-ink">Meet the developer</Link>
      </div>
    </aside>
  );
}

export function BottomNavView({ path, me = null }: { path: string; me?: Me | null }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line/70 bg-surface/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl md:hidden">
      {MOBILE.map((i) => {
        const on = active(path, i.href) || (i.href === "/profile" && active(path, "/tutorial"));
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 text-[0.7rem] leading-tight font-medium ${on ? "text-ink" : "text-muted"}`}>
            {/* "Me" shows your own picture once you've added one */}
            {i.icon === "me" && me?.avatar
              ? <span className={`rounded-full ring-2 ${on ? "ring-accent-edge" : "ring-transparent"}`}><Avatar me={me} size={24} /></span>
              : <span className={`grid h-8 w-12 place-items-center rounded-full ${on ? "bg-accent/15 text-accent-edge" : ""}`}><Icon name={i.icon} /></span>}
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
