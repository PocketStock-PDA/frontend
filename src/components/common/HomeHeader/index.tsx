"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/** 홈 전용 헤더: 인사말 + 알림벨 + 원/달러 토글 + 햄버거 */
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
      <div className="pt-3">
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h1 className="truncate text-xl font-bold text-foreground">
            안녕하세요, {userName}님
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex items-center rounded-full bg-muted p-0.5">
              {(["KRW", "USD"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCurrencyChange?.(c)}
                  aria-label={c === "KRW" ? "원화" : "달러"}
                  aria-pressed={currency === c}
                  className={cn(
                    "size-7 rounded-full text-xs font-bold transition-colors",
                    currency === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {c === "KRW" ? "₩" : "$"}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onBellClick}
              aria-label="알림"
            >
              <Bell />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={openSidebar}
              aria-label="메뉴"
            >
              <Menu />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
