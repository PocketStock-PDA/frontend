"use client";

import { Bell, Menu } from "lucide-react";
import { useUiStore } from "@/store/uiStore";

export interface HomeHeaderProps {
  userName: string;
  onBellClick?: () => void;
  /** 안읽음 알림 개수 — 0이면 뱃지 미표시 */
  unreadCount?: number;
}

/** 홈 전용 헤더: 인사말(좌) + 알림벨·햄버거(우) */
export function HomeHeader({
  userName,
  onBellClick,
  unreadCount = 0,
}: HomeHeaderProps) {
  const openSidebar = useUiStore((s) => s.openSidebar);

  return (
    // AppHeader와 동일하게 상단 고정. -mx-5/-mt로 PageContainer 여백을 상쇄해
    // 노치까지 붙고, pt로 노치 영역을 비운다.
    <header className="sticky top-0 z-40 -mx-5 -mt-[calc(env(safe-area-inset-top)+1.5rem)] mb-4 bg-background px-5 pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
            안녕하세요, {userName}님
          </h1>
        </div>

        <div className="-mr-1 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onBellClick}
            aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
            className="relative flex size-10 items-center justify-center text-foreground"
          >
            <Bell className="size-6" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={openSidebar}
            aria-label="메뉴"
            className="flex size-10 items-center justify-center text-foreground"
          >
            <Menu className="size-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
