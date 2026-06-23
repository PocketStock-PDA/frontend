"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, PieChart, Home, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCmaHome } from "@/hooks/queries/useCmaHome";

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
  const { data } = useCmaHome();

  // CMA 계좌(=온보딩 완료)가 있어야 네비바 노출. 홈 도달 전(계좌개설 플로우 등)엔 숨김.
  if (!data) return null;

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
