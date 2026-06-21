"use client";

import { Bell, Menu } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

type Currency = "KRW" | "USD";

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
  currency?: Currency;
  onCurrencyChange?: (c: Currency) => void;
}

/** 홈 전용 헤더: 인사말(좌) + 알림벨·햄버거(우 상단) + 원/달러 토글(우 하단) */
export function HomeHeader({
  userName,
  date = new Date(),
  onBellClick,
  currency = "KRW",
  onCurrencyChange,
}: HomeHeaderProps) {
  const openSidebar = useUiStore((s) => s.openSidebar);

  return (
    <header className="bg-background px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex items-start justify-between gap-2 pt-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{formatDate(date)}</p>
          <h1 className="mt-0.5 truncate text-[22px] font-bold leading-tight text-foreground">
            안녕하세요, {userName}님
          </h1>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onBellClick}
              aria-label="알림"
              className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <Bell className="size-5" />
            </button>
            <button
              type="button"
              onClick={openSidebar}
              aria-label="메뉴"
              className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <Menu className="size-5" />
            </button>
          </div>

          <div className="flex items-center rounded-full bg-muted p-0.5">
            {(["KRW", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCurrencyChange?.(c)}
                aria-label={c === "KRW" ? "원화" : "달러"}
                aria-pressed={currency === c}
                className={cn(
                  "size-6 rounded-full text-xs font-bold transition-colors",
                  currency === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {c === "KRW" ? "₩" : "$"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
