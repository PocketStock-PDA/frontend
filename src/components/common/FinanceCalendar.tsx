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
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export interface FinanceCalendarProps {
  month: Date;
  onMonthChange?: (month: Date) => void;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  /** true면 selectedDate가 속한 주만 표시 */
  collapsed?: boolean;
  renderDay?: (date: Date, isCurrentMonth: boolean) => React.ReactNode;
  legend?: React.ReactNode;
  /** false면 월 네비게이션 헤더를 숨김 */
  showHeader?: boolean;
  className?: string;
}

export function FinanceCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  collapsed = false,
  renderDay,
  legend,
  showHeader = true,
  className,
}: FinanceCalendarProps) {
  const reduceMotion = useReducedMotion();
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const selectedWeekIdx = selectedDate
    ? weeks.findIndex((w) => w.some((d) => isSameDay(d, selectedDate)))
    : -1;

  return (
    <div className={cn("bg-background", className)}>
      {showHeader ? (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex flex-1 items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onMonthChange?.(subMonths(month, 1))}
              aria-label="이전 달"
            >
              <ChevronLeft className="size-5 text-muted-foreground" />
            </button>
            <span className="min-w-[3rem] text-center text-base font-bold text-foreground underline decoration-foreground underline-offset-4">
              {format(month, "M월")}
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
      ) : (
        // 헤더를 숨겨도 legend는 별도 행으로 렌더링
        // min-h: 탭별 legend 높이차(물결 토글 vs 칩)로 캘린더가 밀리지 않도록 고정
        legend && (
          <div className="mb-3 flex min-h-[28px] items-center justify-end">
            {legend}
          </div>
        )
      )}

      <div className="grid grid-cols-7 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-1 font-medium",
              i === 0
                ? "text-[#F2696B]"
                : i === 6
                  ? "text-[#5B9BF5]"
                  : "text-muted-foreground",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week, wi) => {
          const isSelectedWeek = wi === selectedWeekIdx;
          const visible = !collapsed || isSelectedWeek;

          return (
            <motion.div
              key={wi}
              className="grid grid-cols-7 overflow-hidden"
              animate={{
                height: visible ? "auto" : 0,
                opacity: visible ? 1 : 0,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.32, 0.72, 0, 1] }}
              style={{ willChange: "height, opacity" }}
            >
              {week.map((d) => {
                const inMonth = isSameMonth(d, month);
                const selected = selectedDate && isSameDay(d, selectedDate);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => onSelectDate?.(d)}
                    aria-label={format(d, "M월 d일")}
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
                          "font-numeric flex h-full w-full items-center justify-center rounded-lg text-sm text-foreground",
                          selected && "ring-2 ring-primary",
                        )}
                      >
                        {d.getDate()}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
