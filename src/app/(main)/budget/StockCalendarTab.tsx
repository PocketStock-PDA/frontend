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
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { StockEvent, StockEventType } from "@/types/domain/stockCalendar";
import type { OrderHistoryItem } from "@/types/domain/order";

// 거래(매수/매도) 색 — 한국식: 매수 red, 매도 blue
const TRADE_BUY = "#F04452";
const TRADE_SELL = "#3182F6";

// 이벤트 뱃지/범례 색 (배당 green, 실적 amber)
const EVENT_COLORS: Record<StockEventType, string> = {
  RECOMMEND: "#0471E9",
  DIVIDEND: "#22C55E",
  EARNINGS: "#F59E0B",
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
  // 추천(RECOMMEND) 이벤트는 캘린더에서 노출하지 않음 — 배당·실적만 표시
  const events = (calendarQ.data?.events ?? []).filter(
    (e) => e.eventType !== "RECOMMEND",
  );
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
  // 캘린더 이벤트 종목명 조회용 (보유에 없는 코드만 추가 조회) — 셀에 코드 대신 이름 표시
  const eventCodes = [...new Set(events.map((e) => e.stockCode))].filter(
    (c) => !codes.includes(c),
  );
  const eventDetails = useStockDetails(eventCodes);
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

  // 선택한 날짜의 거래만 (달력에서 날짜 클릭 시 해당 일자 거래 노출)
  const selectedDayTrades = monthTrades.filter((o) =>
    isSameDay(new Date(o.createdAt), selectedDate),
  );

  // 종목코드 → 이름 (보유 + 이벤트 상세에서, 없으면 코드 폴백)
  const nameByCode = new Map<string, string>();
  holdings.forEach((h, i) => {
    const n = details[i]?.data?.stockName;
    if (n) nameByCode.set(h.stockCode, n);
  });
  eventCodes.forEach((c, i) => {
    const n = eventDetails[i]?.data?.stockName;
    if (n) nameByCode.set(c, n);
  });

  const changeMonth = (m: Date) => {
    setCalendarMonth(m);
    setSelectedDate(new Date(m.getFullYear(), m.getMonth(), 1));
  };

  const today = startOfDay(new Date());

  return (
    <div>
      {/* ── 상단 요약 (월 네비 + 총 수익률) — 가계부 탭과 동일 레이아웃 ── */}
      <div className="mb-3 mt-4">
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
        {/* h-[52px] 고정: 가계부 탭과 달력 시작 y 정렬용 (양 탭 동일 높이) */}
        <button
          type="button"
          onClick={() => router.push("/portfolio")}
          className="flex h-[52px] w-full flex-col items-end justify-center gap-1"
        >
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            내 보유주식 수익률
            <ChevronRight className="size-3" />
          </span>
          {returnLoading ? (
            <span className="font-numeric text-xs text-muted-foreground">
              계산 중...
            </span>
          ) : hasHoldings ? (
            <div className="flex items-baseline gap-1.5">
              <ChangeIndicator value={totalRate.toNumber()} percent size="sm" />
              <span className="font-numeric text-[11px] text-muted-foreground">
                {totalProfit.gte(0) ? "+" : "-"}
                {formatKRW(totalProfit.abs().toString())}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">보유 종목 없음</span>
          )}
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

          // 가계부 탭과 동일: 주말(일 빨강/토 파랑)·오늘·미래 날짜색
          // 단, 이벤트(배당/실적)가 있는 날은 미래여도 회색 처리하지 않고 정상 색 유지
          const dow = date.getDay(); // 0=일, 6=토
          const dateColor = isFuture && !first
            ? "#B5BBC3"
            : isToday
              ? "#2563EB"
              : dow === 0
                ? "#F2696B"
                : dow === 6
                  ? "#1D4ED8"
                  : "#1A1D23";

          return (
            <span
              className={cn(
                "relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-[14px] bg-card transition-shadow",
                first
                  ? "shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                  : "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
                isSelected && "ring-1 ring-[#0471E9]",
              )}
            >
              {tradeDots}
              <span
                className={cn(
                  "font-numeric relative text-[11px] leading-none",
                  isToday && "font-bold",
                )}
                style={{ color: dateColor }}
              >
                {date.getDate()}
              </span>
              {first && (
                <span
                  className="absolute inset-x-0.5 bottom-1 overflow-hidden whitespace-nowrap text-clip rounded-[3px] px-0.5 py-px text-center text-[8px] leading-none text-white"
                  style={{ background: EVENT_COLORS[first.eventType] }}
                >
                  {dayEvents && dayEvents.length > 1
                    ? `+${dayEvents.length}`
                    : (nameByCode.get(first.stockCode) ?? first.stockCode)}
                </span>
              )}
            </span>
          );
        }}
        legend={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            {(["DIVIDEND", "EARNINGS"] as StockEventType[]).map((type) => (
              <span key={type} className="flex items-center gap-1">
                <span className="size-3 rounded-[3px]" style={{ background: EVENT_COLORS[type] }} />
                {EVENT_LABELS[type]}
              </span>
            ))}
            <span className="flex items-center gap-1">
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

      {/* ── 선택한 날 거래(매수/매도) — 거래 있을 때만 노출 ── */}
      {selectedDayTrades.length > 0 && (
        <>
          <p className="pb-2 pt-5 text-xs font-medium text-muted-foreground">
            {format(selectedDate, "M월 d일")} 거래
          </p>
          <div className="divide-y divide-border">
            {selectedDayTrades.map((o) => (
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
  const quantity = toDecimal(order.quantity);
  const hasQty = quantity.gt(0);
  const hasPrice = order.price !== null && order.price !== undefined;
  // 금액(AMOUNT) 주문은 수량 대신 주문 금액 표시 — 해외는 $, 국내는 원
  const amountText =
    order.orderAmount !== null && order.orderAmount !== undefined
      ? order.currency === "USD"
        ? formatUSD(order.orderAmount)
        : formatKRW(order.orderAmount)
      : null;
  // 수량 주문: "X주 · 체결가" / 금액 주문: 금액만
  const detail = hasQty
    ? [`${quantity.toString()}주`, hasPrice ? formatKRW(order.price) : null]
        .filter(Boolean)
        .join(" · ")
    : amountText;

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
          {detail && (
            <p className="font-numeric text-[11px] text-muted-foreground">{detail}</p>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {format(new Date(order.createdAt), "HH:mm")}
      </span>
    </div>
  );
}

function EventRow({ event }: { event: StockEvent }) {
  const badgeColor = EVENT_COLORS[event.eventType];

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="shrink-0 rounded-full px-2 py-[3px] text-[11px] text-white"
            style={{ background: badgeColor }}
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
