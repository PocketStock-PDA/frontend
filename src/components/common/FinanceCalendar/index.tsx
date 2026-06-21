"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export interface FinanceCalendarProps {
  month: Date;
  onMonthChange?: (month: Date) => void;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  /** 각 날짜 셀 커스텀 (가계부 히트맵 / 증권 배지 등). 미지정 시 기본 날짜 표시 */
  renderDay?: (date: Date, isCurrentMonth: boolean) => React.ReactNode;
  /** 우측 상단 범례 */
  legend?: React.ReactNode;
  className?: string;
}

/** 월 그리드 캘린더. 흰 배경, 날짜 셀은 renderDay로 커스텀 */
export function FinanceCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  renderDay,
  legend,
  className,
}: FinanceCalendarProps) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className={cn("bg-background", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange?.(subMonths(month, 1))}
            aria-label="이전 달"
          >
            <ChevronLeft className="size-5 text-muted-foreground" />
          </button>
          <span className="text-base font-bold text-foreground">
            {format(month, "yyyy년 M월")}
          </span>
          <button
            type="button"
            onClick={() => onMonthChange?.(addMonths(month, 1))}
            aria-label="다음 달"
          >
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        </div>
        {legend}
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const selected = selectedDate && isSameDay(d, selectedDate);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelectDate?.(d)}
              className={cn(
                "aspect-square bg-background p-1",
                !inMonth && "opacity-40",
              )}
            >
              {renderDay ? (
                renderDay(d, inMonth)
              ) : (
                <span
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-lg text-sm text-foreground",
                    selected && "ring-2 ring-primary",
                  )}
                >
                  {d.getDate()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
