import { PageContainer } from "@/components/common/PageContainer";
import { RequireAuthOnly } from "@/lib/auth/AuthProvider";

/**
 * 온보딩 그룹 레이아웃 — 로그인 직후 풀스크린 플로우(슈퍼쏠·계좌개설·자산연동).
 * 로그인만 요구(이벤트 게이트 없음)하고 하단 네비바·사이드바는 두지 않는다(홈 도달 전 비노출).
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuthOnly>
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </RequireAuthOnly>
  );
}
