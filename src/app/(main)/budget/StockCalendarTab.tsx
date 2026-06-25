"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Decimal from "decimal.js";
import { FinanceCalendar } from "@/components/common/FinanceCalendar";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useStockCalendar } from "@/hooks/queries/useStockCalendar";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useOrders } from "@/hooks/queries/useOrders";
import { formatKRW } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { StockEvent, StockEventType } from "@/types/domain/stockCalendar";
import type { OrderHistoryItem } from "@/types/domain/order";

// 거래(매수/매도) 색 — 한국식: 매수 red, 매도 blue
const TRADE_BUY = "#F04452";
const TRADE_SELL = "#3182F6";

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
  const router = useRouter();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const calendarQ = useStockCalendar(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
  );
  const events = calendarQ.data?.events ?? [];
  const eventMap = new Map<string, StockEvent[]>();
  events.forEach((e) => {
    const list = eventMap.get(e.eventDate) ?? [];
    list.push(e);
    eventMap.set(e.eventDate, list);
  });

  // ── 보유주식 총 수익률 (포트폴리오 페이지와 동일하게 decimal.js 계산) ──
  const holdingsQ = useHoldings();
  const holdings = holdingsQ.data ?? [];
  const codes = holdings.map((h) => h.stockCode);
  const details = useStockDetails(codes);
  const detailsLoading = codes.length > 0 && details.some((d) => d.isLoading);
  const returnLoading = holdingsQ.isLoading || detailsLoading;

  const totals = holdings.reduce(
    (acc, h, i) => {
      const qty = toDecimal(h.quantity);
      const price = toDecimal(details[i]?.data?.price?.currentPrice);
      acc.eval = acc.eval.plus(qty.times(price));
      acc.invested = acc.invested.plus(qty.times(toDecimal(h.avgBuyPrice)));
      return acc;
    },
    { eval: new Decimal(0), invested: new Decimal(0) },
  );
  const totalProfit = totals.eval.minus(totals.invested);
  const totalRate = totals.invested.gt(0)
    ? totalProfit.div(totals.invested).times(100)
    : new Decimal(0);
  const hasHoldings = holdings.length > 0;

  // ── 이번 달 거래(매수/매도) — 주문내역(useOrders)에서 ──
  const ordersQ = useOrders();
  const monthTrades = (ordersQ.data ?? [])
    .filter((o) => {
      // 체결된 거래만(REJECTED·PENDING·QUEUED 제외). AMOUNT 주문은 quantity=null이라 수량 필터 금지
      if (o.status !== "FILLED") return false;
      const d = new Date(o.createdAt);
      return (
        d.getFullYear() === calendarMonth.getFullYear() &&
        d.getMonth() === calendarMonth.getMonth()
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // 날짜별 매수/매도 유무 (달력 점 마커용)
  const tradeMap = new Map<string, { buy: boolean; sell: boolean }>();
  monthTrades.forEach((o) => {
    const key = format(new Date(o.createdAt), "yyyy-MM-dd");
    const cur = tradeMap.get(key) ?? { buy: false, sell: false };
    if (o.side === "SELL") cur.sell = true;
    else cur.buy = true;
    tradeMap.set(key, cur);
  });

  // 종목코드 → 이름 (보유 상세에서, 없으면 코드 폴백)
  const nameByCode = new Map<string, string>();
  holdings.forEach((h, i) => {
    const n = details[i]?.data?.stockName;
    if (n) nameByCode.set(h.stockCode, n);
  });

  const changeMonth = (m: Date) => {
    setCalendarMonth(m);
    setSelectedDate(new Date(m.getFullYear(), m.getMonth(), 1));
  };

  const today = startOfDay(new Date());

  return (
    <div>
      {/* ── 상단 요약 (월 네비 + 총 수익률) — 가계부 탭과 동일 레이아웃 ── */}
      <div className="mt-4">
        <div className="mb-0.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                changeMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1),
                )
              }
              aria-label="이전 달"
            >
              <ChevronLeft className="size-5 text-muted-foreground" />
            </button>
            <span className="text-base font-bold text-foreground">
              {format(calendarMonth, "M월")}
            </span>
            <button
              type="button"
              onClick={() =>
                changeMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1),
                )
              }
              aria-label="다음 달"
            >
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* 총 수익률 — 탭 시 포트폴리오로 이동 */}
        <button
          type="button"
          onClick={() => router.push("/portfolio")}
          className="w-full text-left"
        >
          <div className="flex items-center justify-end">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-muted-foreground underline underline-offset-2">
                내 보유주식 수익률
              </span>
              {returnLoading ? (
                <span className="font-numeric text-xs text-muted-foreground">
                  계산 중...
                </span>
              ) : hasHoldings ? (
                <div className="flex items-baseline gap-1.5">
                  <ChangeIndicator
                    value={totalRate.toNumber()}
                    percent
                    size="sm"
                  />
                  <span className="font-numeric text-[11px] text-muted-foreground">
                    {totalProfit.gte(0) ? "+" : "-"}
                    {formatKRW(totalProfit.abs().toString())}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  보유 종목 없음
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* ── 달력 ── */}
      <FinanceCalendar
        month={calendarMonth}
        onMonthChange={changeMonth}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        showHeader={false}
        className="pt-4"
        renderDay={(date, isCurrentMonth) => {
          if (!isCurrentMonth) return <span />;

          const key = format(date, "yyyy-MM-dd");
          const dayEvents = eventMap.get(key);
          const isFuture = isAfter(startOfDay(date), today);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const first = dayEvents?.[0];
          const trade = tradeMap.get(key);
          // 매수/매도 점 마커 (우상단)
          const tradeDots = trade ? (
            <span className="absolute right-1 top-1 flex gap-0.5">
              {trade.buy && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: TRADE_BUY }}
                />
              )}
              {trade.sell && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: TRADE_SELL }}
                />
              )}
            </span>
          ) : null;

          if (first) {
            const c = EVENT_COLORS[first.eventType];
            return (
              <span
                className={cn(
                  "relative flex aspect-square w-full flex-col items-center justify-center gap-[3px] rounded-[10px] border",
                  isSelected && "ring-2 ring-primary ring-offset-1",
                )}
                style={{ background: c.bg, borderColor: c.border }}
              >
                {tradeDots}
                <span
                  className="font-numeric text-[11px] leading-none"
                  style={{ color: c.dateColor }}
                >
                  {date.getDate()}
                </span>
                <span
                  className="font-numeric rounded-[3px] px-1 py-px text-[9px] leading-none text-white"
                  style={{ background: c.badgeBg }}
                >
                  {dayEvents.length > 1 ? `+${dayEvents.length}` : first.stockCode}
                </span>
              </span>
            );
          }

          return (
            <span
              className={cn(
                "relative flex aspect-square w-full items-center justify-center rounded-[10px]",
                isSelected && "ring-2 ring-primary ring-offset-1",
              )}
            >
              {tradeDots}
              <span
                className={cn(
                  "font-numeric text-[11px]",
                  isFuture
                    ? "text-muted-foreground/40"
                    : isToday
                      ? "font-bold text-primary"
                      : "text-muted-foreground",
                )}
              >
                {date.getDate()}
              </span>
            </span>
          );
        }}
        legend={
          <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: TRADE_BUY }} />
              매수
              <span className="ml-0.5 size-1.5 rounded-full" style={{ background: TRADE_SELL }} />
              매도
            </span>
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

      {/* ── 이번 달 거래(매수/매도) ── */}
      {monthTrades.length > 0 && (
        <>
          <p className="pb-2 pt-5 text-xs font-medium text-muted-foreground">
            이번 달 거래
          </p>
          <div className="divide-y divide-border">
            {monthTrades.map((o) => (
              <TradeRow
                key={o.orderId}
                order={o}
                name={nameByCode.get(o.stockCode) ?? o.stockCode}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TradeRow({ order, name }: { order: OrderHistoryItem; name: string }) {
  const isBuy = order.side !== "SELL";
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        <span
          className="shrink-0 rounded-full px-2 py-[3px] text-[11px] text-white"
          style={{ background: isBuy ? TRADE_BUY : TRADE_SELL }}
        >
          {isBuy ? "매수" : "매도"}
        </span>
        <div className="space-y-[2px]">
          <p className="text-xs font-medium text-foreground">{name}</p>
          {(toDecimal(order.quantity).gt(0) || order.price != null) && (
            <p className="font-numeric text-[11px] text-muted-foreground">
              {[
                toDecimal(order.quantity).gt(0)
                  ? `${toDecimal(order.quantity).toString()}주`
                  : null,
                order.price != null ? formatKRW(order.price) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {format(new Date(order.createdAt), "M.d")}
      </span>
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
            <p className="text-[11px] text-muted-foreground">{event.detail}</p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">{event.eventDate}</span>
      </div>
    </div>
  );
}
