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
  sticky = true,
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
        "box-content flex h-14 items-center gap-1 bg-background px-2 pt-[env(safe-area-inset-top)]",
        sticky && "sticky top-0 z-40",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
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
          <h1 className="truncate text-base font-bold text-foreground">
            {title}
          </h1>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
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
            size="icon"
            onClick={openSidebar}
            aria-label="메뉴"
          >
            <Menu />
          </Button>
        )}
      </div>
    </header>
  );
}
