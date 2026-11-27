import { Suspense } from "react";
import { BottomNav, BottomNavView, Sidebar, SidebarView } from "@/components/app/Nav";
import { NavTracker } from "@/components/app/NavTracker";
import { getSession } from "@/lib/auth";
import { profileImages } from "@/lib/profile";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      {/* first stop for keyboard users: jump past the menu */}
      <a href="#content" className="sr-only z-50 rounded-[var(--radius)] bg-accent px-4 py-3 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <Suspense fallback={<SidebarView path="" me={null} />}><SidebarWithMe /></Suspense>
      <div id="content" tabIndex={-1} className="min-w-0 flex-1 overflow-x-clip pb-24 outline-none md:pb-0">{children}</div>
      <Suspense fallback={<BottomNavView path="" />}><BottomNavWithMe /></Suspense>
      <Suspense fallback={null}><NavTracker /></Suspense>
    </div>
  );
}

async function currentMe() {
  const session = await getSession();
  return session ? { name: session.user.name, email: session.user.email, avatar: (await profileImages(session.user.id)).avatar } : null;
}
async function SidebarWithMe() { return <Sidebar me={await currentMe()} />; }
async function BottomNavWithMe() { return <BottomNav me={await currentMe()} />; }
