import { Suspense } from "react";
import { BottomNav, BottomNavView, Sidebar, SidebarView } from "@/components/app/Nav";
import { getSession } from "@/lib/auth";
import { profileImages } from "@/lib/profile";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      {/* first stop for keyboard users: jump past the menu */}
      <a href="#content" className="sr-only z-50 rounded-[var(--radius)] bg-accent px-4 py-3 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <Suspense fallback={<SidebarView path="" me={null} />}><SidebarWithMe /></Suspense>
      <div id="content" tabIndex={-1} className="min-w-0 flex-1 pb-24 outline-none md:pb-0">{children}</div>
      <Suspense fallback={<BottomNavView path="" />}><BottomNav /></Suspense>
    </div>
  );
}

async function SidebarWithMe() {
  const session = await getSession();
  const me = session ? { name: session.user.name, email: session.user.email, avatar: (await profileImages(session.user.id)).avatar } : null;
  return <Sidebar me={me} />;
}
