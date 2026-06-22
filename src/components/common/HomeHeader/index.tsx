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
}

/** 홈 전용 헤더: 인사말(좌) + 알림벨·햄버거(우) */
export function HomeHeader({
  userName,
  date = new Date(),
  onBellClick,
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
            aria-label="알림"
            className="flex size-10 items-center justify-center text-foreground"
          >
            <Bell className="size-6" />
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
