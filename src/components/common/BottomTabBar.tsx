"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, PieChart, Home, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";

// 홈 화면 기준 5탭 (가계부 · 증권 · 홈 · 자산 · 마이페이지)
const tabs = [
  { href: "/budget", label: "가계부", icon: BookText },
  { href: "/portfolio", label: "증권", icon: PieChart },
  { href: "/home", label: "홈", icon: Home },
  { href: "/asset", label: "자산", icon: Wallet },
  { href: "/my", label: "마이페이지", icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const { isLoading, error } = useCmaHome();

  // 온보딩 풀스크린 플로우(슈퍼쏠·계좌개설·자산연동)는 (onboarding) 레이아웃이라
  // 애초에 이 컴포넌트가 렌더되지 않음 → 여기선 별도 경로 분기 불필요.
  // 계좌 미개설(404)일 때만 숨김 — 홈의 신규회원(계좌개설 유도) 상태 비노출 목적.
  // 일시적 오류(5xx/네트워크)는 네비바를 유지해 다른 탭 이동을 막지 않는다.
  // 최초 로딩 중에는 확정 전 깜빡임 방지를 위해 숨긴다.
  if (isNoCmaAccount(error) || isLoading) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex h-16 w-full max-w-[430px] -translate-x-1/2 items-center border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px]",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
