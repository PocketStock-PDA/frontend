"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUiStore } from "@/store/uiStore";
import { useLogout } from "@/hooks/mutations/useAuth";
import { useAuth } from "@/lib/auth/AuthProvider";

// TODO: 라우트는 사용자 지정 대기 중 (현재 임시 "#")
const MENU: { label: string; href: string }[] = [
  { label: "주식모으기", href: "/trading" },
  { label: "환전", href: "/exchange" },
  { label: "가계부", href: "/budget" },
  { label: "포트폴리오", href: "/portfolio" },
  { label: "주식 자동모으기 설정", href: "/trading/auto" },
  { label: "거래 내역", href: "#" },
  { label: "내 자산", href: "/asset" },
  { label: "포인트", href: "#" },
  { label: "마이페이지", href: "#" },
];

/** 우측 슬라이드 전체메뉴 사이드바. uiStore로 제어. */
export function Sidebar() {
  const router = useRouter();
  const isOpen = useUiStore((s) => s.isSidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const { setGuest } = useAuth();
  const logout = useLogout();

  const handleLogout = () => {
    if (logout.isPending) return;
    closeSidebar();
    // 성공/실패와 무관하게(useLogout onSettled가 세션·캐시 정리) 게스트 전환 후 로그인으로
    logout.mutate(undefined, {
      onSettled: () => {
        setGuest();
        router.replace("/login");
      },
    });
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeSidebar();
      }}
    >
      <SheetContent
        side="right"
        className="w-[80%] gap-0 px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:max-w-sm"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-0">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex w-fit items-center gap-0.5 text-sm text-muted-foreground disabled:opacity-50"
          >
            {logout.isPending ? "로그아웃 중..." : "로그아웃"}
            <ChevronRight className="size-4" />
          </button>
          <SheetTitle className="sr-only">전체 메뉴</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          <h2 className="mb-2 text-sm font-bold text-foreground">
            최근/MY 메뉴
          </h2>
          <div className="mb-6 flex h-28 items-center justify-center rounded-2xl bg-brand-surface text-sm text-muted-foreground">
            최근 메뉴가 없습니다
          </div>

          <h2 className="mb-1 text-sm font-bold text-foreground">전체 메뉴</h2>
          <nav className="flex flex-col">
            {MENU.map((m) => (
              <Link
                key={m.label}
                href={m.href}
                onClick={closeSidebar}
                className="py-3 text-base font-bold text-foreground"
              >
                {m.label}
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
