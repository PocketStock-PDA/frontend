import { BottomTabBar } from "@/components/common/BottomTabBar";
import { Sidebar } from "@/components/common/Sidebar";
import { PageContainer } from "@/components/common/PageContainer";
import { PushSync } from "@/components/common/PushSync";
import { TradingSync } from "@/components/common/TradingSync";
import { RequireAuth } from "@/lib/auth/AuthProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        {/* 모바일 폭 + 좌우 공통 여백을 모든 (main) 페이지에 일괄 적용 */}
        <main className="flex-1 pb-(--bottom-nav-offset)">
          <PageContainer>{children}</PageContainer>
        </main>
        <BottomTabBar />
        <Sidebar />
        <PushSync />
        <TradingSync />
      </div>
    </RequireAuth>
  );
}
