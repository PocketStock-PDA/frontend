"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, PieChart, Home, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";

// 홈 화면 기준 5탭 (가계부 · 포트폴리오 · 홈 · 자산 · 마이페이지)
const tabs = [
  { href: "/budget", label: "가계부", icon: BookText },
  { href: "/portfolio", label: "포트폴리오", icon: PieChart },
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
    // 떠 있는(floating) 알약형 네비. 바깥 래퍼는 클릭을 통과시키고(pointer-events-none)
    // 알약만 클릭을 받는다(pointer-events-auto) → 알약 위/옆 영역의 콘텐츠 탭을 막지 않음.
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2">
      <div className="pointer-events-auto flex items-center justify-around rounded-full border border-border/60 bg-background/60 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 text-[11px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn("size-5 shrink-0", isActive && "fill-primary/15")}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span className={cn(isActive && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
