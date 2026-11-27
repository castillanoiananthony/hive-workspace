import { BottomNav, Sidebar } from "@/components/app/Nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-24 md:pb-0">{children}</div>
      <BottomNav />
    </div>
  );
}
