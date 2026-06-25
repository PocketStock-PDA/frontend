"use client";

import { cn } from "@/lib/utils";
import type { Weekday } from "@/types/domain/autoInvest";

const DAYS: { label: string; value: Weekday }[] = [
  { label: "월", value: "MON" },
  { label: "화", value: "TUE" },
  { label: "수", value: "WED" },
  { label: "목", value: "THU" },
  { label: "금", value: "FRI" },
  { label: "토", value: "SAT" },
  { label: "일", value: "SUN" },
];

export interface WeekdayPickerProps {
  value: Weekday[];
  onChange: (value: Weekday[]) => void;
  disabled?: boolean;
  /** 단일 선택(주1회): 항상 1개만 선택 */
  single?: boolean;
  /** 평일만(월~금) — 정기적립 주1회는 백엔드가 월~금만 지원 */
  businessDaysOnly?: boolean;
  className?: string;
}

/** 요일(월~일) 선택. 최소 1개는 항상 유지. single이면 1개만. 활성 = 브랜드 블루 */
export function WeekdayPicker({
  value,
  onChange,
  disabled = false,
  single = false,
  businessDaysOnly = false,
  className,
}: WeekdayPickerProps) {
  const days = businessDaysOnly
    ? DAYS.filter((d) => d.value !== "SAT" && d.value !== "SUN")
    : DAYS;
  const select = (d: Weekday) => {
    // 단일 선택: 항상 1개만(같은 날 다시 눌러도 유지)
    if (single) {
      onChange([d]);
      return;
    }
    // 다중 선택: 토글하되 마지막 1개는 해제 불가(최소 1개 유지)
    if (value.includes(d)) {
      if (value.length <= 1) return;
      onChange(value.filter((v) => v !== d));
    } else {
      onChange([...value, d]);
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {days.map((d) => {
        const active = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => select(d.value)}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-bold transition-colors disabled:opacity-40",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}
