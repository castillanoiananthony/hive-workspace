import { Suspense } from "react";
import { BottomNav, BottomNavView, Sidebar, SidebarView } from "@/components/app/Nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<SidebarView path="" />}><Sidebar /></Suspense>
      <div className="min-w-0 flex-1 pb-24 md:pb-0">{children}</div>
      <Suspense fallback={<BottomNavView path="" />}><BottomNav /></Suspense>
    </div>
  );
}
