"use client";

import { Bell, Menu } from "lucide-react";
import { useUiStore } from "@/store/uiStore";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 2026.06.04 목요일
function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day} ${DAYS[d.getDay()]}요일`;
}

export interface HomeHeaderProps {
  userName: string;
  date?: Date;
  onBellClick?: () => void;
  /** 안읽음 알림 개수 — 0이면 뱃지 미표시 */
  unreadCount?: number;
}

/** 홈 전용 헤더: 인사말(좌) + 알림벨·햄버거(우) */
export function HomeHeader({
  userName,
  date = new Date(),
  onBellClick,
  unreadCount = 0,
}: HomeHeaderProps) {
  const openSidebar = useUiStore((s) => s.openSidebar);

  return (
    <header className="mb-4 bg-background">
      <div className="flex items-start justify-between gap-2 pt-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{formatDate(date)}</p>
          <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-foreground">
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
