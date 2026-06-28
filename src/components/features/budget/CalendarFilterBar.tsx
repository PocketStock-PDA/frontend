"use client";

import { cn } from "@/lib/utils";

// 증권 캘린더 렌즈(필터): 전체 / 거래 / 모으기 / 일정
export type CalendarLens = "all" | "trade" | "gather" | "event";

const LENS_TABS: { value: CalendarLens; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "trade", label: "거래" },
  { value: "gather", label: "모으기" },
  { value: "event", label: "일정" },
];

interface CalendarFilterBarProps {
  value: CalendarLens;
  onChange: (lens: CalendarLens) => void;
  className?: string;
}

export function CalendarFilterBar({
  value,
  onChange,
  className,
}: CalendarFilterBarProps) {
  return (
    <div
      className={cn(
        "flex w-full gap-0.5 rounded-[11px] bg-muted p-1",
        className,
      )}
    >
      {LENS_TABS.map((t) => {
        const on = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-colors",
              on
                ? "bg-background text-primary shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
