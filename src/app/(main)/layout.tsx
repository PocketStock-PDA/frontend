import { BottomTabBar } from "@/components/common/BottomTabBar";
import { Sidebar } from "@/components/common/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomTabBar />
      <Sidebar />
    </div>
  );
}
