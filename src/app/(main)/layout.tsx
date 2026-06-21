import { BottomTabBar } from "@/components/common/BottomTabBar";
import { Sidebar } from "@/components/common/Sidebar";
import { PageContainer } from "@/components/common/PageContainer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* 모바일 폭 + 좌우 공통 여백을 모든 (main) 페이지에 일괄 적용 */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <PageContainer>{children}</PageContainer>
      </main>
      <BottomTabBar />
      <Sidebar />
    </div>
  );
}
