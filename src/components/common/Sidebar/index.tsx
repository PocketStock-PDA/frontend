"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUiStore } from "@/store/uiStore";

// TODO: 라우트는 사용자 지정 대기 중 (현재 임시 "#")
const MENU: { label: string; href: string }[] = [
  { label: "주식모으기", href: "#" },
  { label: "환전", href: "#" },
  { label: "가계부", href: "#" },
  { label: "포트폴리오", href: "#" },
  { label: "자동모으기 적립식 설정", href: "#" },
  { label: "거래 내역", href: "#" },
  { label: "자산 리밸런싱", href: "#" },
  { label: "포인트", href: "#" },
  { label: "마이페이지", href: "#" },
];

/** 우측 슬라이드 전체메뉴 사이드바. uiStore로 제어. */
export function Sidebar() {
  const isOpen = useUiStore((s) => s.isSidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

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
            className="flex w-fit items-center gap-0.5 text-sm text-muted-foreground"
          >
            로그아웃
            <ChevronRight className="size-4" />
          </button>
          <SheetTitle className="sr-only">전체 메뉴</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          <h2 className="mb-2 text-sm font-bold text-foreground">최근/MY 메뉴</h2>
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
