"use client";

import { useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { FinanceCalendar } from "@/components/common/FinanceCalendar";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useStockCalendar } from "@/hooks/queries/useStockCalendar";
import { cn } from "@/lib/utils";
import type { StockEvent, StockEventType } from "@/types/domain/stockCalendar";

const EVENT_COLORS: Record<
  StockEventType,
  { bg: string; border: string; dateColor: string; badgeBg: string; chipBg: string; chipText: string }
> = {
  RECOMMEND: {
    bg: "#F0F6FF", border: "#C8DFF8", dateColor: "#0471E9",
    badgeBg: "#0471E9", chipBg: "#F0F6FF", chipText: "#0471E9",
  },
  DIVIDEND: {
    bg: "#F0FDF4", border: "#BBF7D0", dateColor: "#22C55E",
    badgeBg: "#22C55E", chipBg: "#F0FDF4", chipText: "#22C55E",
  },
  EARNINGS: {
    bg: "#FEF9EC", border: "#FDE68A", dateColor: "#F59E0B",
    badgeBg: "#F59E0B", chipBg: "#FEF3C7", chipText: "#F59E0B",
  },
};

const EVENT_LABELS: Record<StockEventType, string> = {
  RECOMMEND: "추천",
  DIVIDEND: "배당",
  EARNINGS: "실적",
};

export function StockCalendarTab() {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const calendarQ = useStockCalendar(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
  );
  const events = calendarQ.data?.events ?? [];
  const eventMap = new Map<string, StockEvent>();
  events.forEach((e) => eventMap.set(e.eventDate, e));

  const today = startOfDay(new Date());

  return (
    <div>
      <FinanceCalendar
        month={calendarMonth}
        onMonthChange={(m) => {
          setCalendarMonth(m);
          setSelectedDate(new Date(m.getFullYear(), m.getMonth(), 1));
        }}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        className="pt-4"
        renderDay={(date, isCurrentMonth) => {
          if (!isCurrentMonth) return <span />;

          const key = format(date, "yyyy-MM-dd");
          const event = eventMap.get(key);
          const isFuture = isAfter(startOfDay(date), today);
          const isSelected = isSameDay(date, selectedDate);

          if (isSelected) {
            return (
              <span className="flex aspect-square w-full flex-col items-center justify-center rounded-lg bg-primary">
                <span className="text-[11px] leading-none text-white">{date.getDate()}</span>
              </span>
            );
          }

          if (event) {
            const c = EVENT_COLORS[event.eventType];
            return (
              <span
                className="flex aspect-square w-full flex-col items-center justify-center gap-[3px] rounded-lg border"
                style={{ background: c.bg, borderColor: c.border }}
              >
                <span className="text-[11px] leading-none" style={{ color: c.dateColor }}>
                  {date.getDate()}
                </span>
                <span
                  className="rounded-[3px] px-1 py-px text-[9px] leading-none text-white"
                  style={{ background: c.badgeBg }}
                >
                  {event.stockCode}
                </span>
              </span>
            );
          }

          return (
            <span
              className="flex aspect-square w-full items-center justify-center rounded-lg"
              style={{ background: isFuture ? "#F8F8F8" : "#F5F5F5" }}
            >
              <span className="text-[11px]" style={{ color: isFuture ? "#DDDDDD" : "#AAAAAA" }}>
                {date.getDate()}
              </span>
            </span>
          );
        }}
        legend={
          <div className="flex items-center gap-1.5">
            {(["RECOMMEND", "DIVIDEND", "EARNINGS"] as StockEventType[]).map((type) => {
              const c = EVENT_COLORS[type];
              return (
                <span
                  key={type}
                  className="rounded-full px-2 py-[3px] text-[11px]"
                  style={{ background: c.chipBg, color: c.chipText }}
                >
                  {EVENT_LABELS[type]}
                </span>
              );
            })}
          </div>
        }
      />

      <div className="-mx-5 mt-4 h-2 bg-muted" />
      <p className="pb-2 pt-[15px] text-xs font-medium text-muted-foreground">이번 달 주요 일정</p>

      {calendarQ.isLoading ? (
        <SkeletonCard lines={4} />
      ) : calendarQ.isError ? (
        <EmptyState title="일정을 불러오지 못했어요" />
      ) : events.length === 0 ? (
        <EmptyState title="이번 달 일정이 없어요" />
      ) : (
        <div className="divide-y divide-border">
          {events.map((event) => (
            <EventRow key={`${event.eventDate}-${event.stockCode}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: StockEvent }) {
  const c = EVENT_COLORS[event.eventType];

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="shrink-0 rounded-full px-2 py-[3px] text-[11px] text-white"
            style={{ background: c.badgeBg }}
          >
            {EVENT_LABELS[event.eventType]}
          </span>
          <div className="space-y-[2px]">
            <p className="text-xs font-medium text-foreground">{event.title}</p>
            <p className="text-[11px] text-[#AAAAAA]">{event.detail}</p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-[#AAAAAA]">{event.eventDate}</span>
      </div>
    </div>
  );
}
