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
  className?: string;
}

/** 요일(월~일) 다중 선택. 활성 = 브랜드 블루 */
export function WeekdayPicker({
  value,
  onChange,
  disabled = false,
  className,
}: WeekdayPickerProps) {
  const toggle = (d: Weekday) =>
    onChange(value.includes(d) ? value.filter((v) => v !== d) : [...value, d]);

  return (
    <div className={cn("flex gap-2", className)}>
      {DAYS.map((d) => {
        const active = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => toggle(d.value)}
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
