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
  sticky = false,
  className,
}: AppHeaderProps) {
  const router = useRouter();
  const openSidebar = useUiStore((s) => s.openSidebar);
  const handleBack = onBack ?? (() => router.back());
  const handleClose = onClose ?? (() => router.back());
  const menuVisible = showMenu ?? variant === "sub";

  return (
    <header
      className={cn(
        // 기본: 공통 여백 안 in-flow. sticky 지정 시에만 full-bleed 앱바로 상단 고정.
        "mb-4 flex h-14 items-center gap-1 bg-background",
        sticky &&
          "sticky top-0 z-40 -mx-5 box-content px-5 pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      <div className="-ml-2 flex min-w-0 flex-1 items-center gap-1">
        {variant === "sub" && (
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
