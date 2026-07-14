import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
}
