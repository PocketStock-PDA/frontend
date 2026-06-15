import { BottomTabBar } from "@/components/common/BottomTabBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-16">{children}</main>
      <BottomTabBar />
    </div>
  );
}
