"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export interface AppHeaderProps {
  variant?: "sub" | "modal";
  title?: React.ReactNode;
  /** 미지정 시 router.back() */
  onBack?: () => void;
  onClose?: () => void;
  left?: React.ReactNode;
  /** 우측 커스텀(햄버거 왼쪽에 위치) */
  right?: React.ReactNode;
  /** 우측 햄버거(사이드바 토글). 기본 sub에서만 노출 */
  showMenu?: boolean;
  /** 좌측 뒤로가기 버튼 노출(sub 변형 기본 true). 전진형 온보딩 등에서 false로 숨김 */
  showBack?: boolean;
  /** 상단 고정(기본 true). 특수하게 흐름에 두려면 false */
  sticky?: boolean;
  className?: string;
}

/** 서브/모달 상단 헤더. 우측 햄버거로 사이드바를 연다. */
export function AppHeader({
  variant = "sub",
  title,
  onBack,
  onClose,
  left,
  right,
  showMenu,
  showBack = true,
  sticky = true,
  className,
}: AppHeaderProps) {
  const router = useRouter();
  const openSidebar = useUiStore((s) => s.openSidebar);
  const handleBack = onBack ?? (() => router.back());
  const handleClose = onClose ?? (() => router.back());
  const menuVisible = showMenu ?? variant === "sub";
  const backVisible = variant === "sub" && showBack;

  return (
    <header
      className={cn(
        "mb-4 flex h-14 items-center gap-1 bg-background",
        // 기본 고정: full-bleed 앱바로 상단 고정. -mx-5/-mt는 PageContainer 여백
        // (px-5, pt=safe-area+1.5rem)을 상쇄해 노치까지 붙고, pt로 노치를 비운다.
        sticky &&
          "sticky top-0 z-40 -mx-5 -mt-[calc(env(safe-area-inset-top)+1.5rem)] box-content px-5 pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1",
          // 뒤로가기 버튼이 있을 때만 아이콘 패딩만큼 보정(없으면 타이틀이 본문과 정렬)
          backVisible && "-ml-2",
        )}
      >
        {backVisible && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="뒤로"
          >
            <ChevronLeft />
          </Button>
        )}
        {left}
        {title && (
          <h1 className="truncate text-[18px] font-bold text-foreground">
            {title}
          </h1>
        )}
      </div>

      <div className="-mr-2 flex shrink-0 items-center gap-1">
        {right}
        {variant === "modal" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X />
          </Button>
        )}
        {menuVisible && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={openSidebar}
            aria-label="메뉴"
          >
            <Menu className="size-6" />
          </Button>
        )}
      </div>
    </header>
  );
}
