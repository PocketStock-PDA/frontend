"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Decimal from "decimal.js";
import { FinanceCalendar } from "@/components/common/FinanceCalendar";
import { parseUTC } from "@/lib/utils/date";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarFilterBar,
  type CalendarLens,
} from "@/components/features/budget/CalendarFilterBar";
import { useStockCalendar } from "@/hooks/queries/useStockCalendar";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { usePortfolioSummary } from "@/hooks/queries/usePortfolioSummary";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useOrders } from "@/hooks/queries/useOrders";
import { useAutoInvestSummary } from "@/hooks/queries/useAutoInvest";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { StockEvent, StockEventType } from "@/types/domain/stockCalendar";
import type { OrderHistoryItem } from "@/types/domain/order";
import type { AutoInvestStock } from "@/types/domain/autoInvest";
import type { StockDetail } from "@/types/domain/trading";

// 거래(매수/매도) 색 — 한국식: 매수 red, 매도 blue
const TRADE_BUY = "#F04452";
const TRADE_SELL = "#3182F6";
// 모으기(자동적립) 시그니처 보라 — 매도파랑·브랜드파랑과 분리
const GATHER = "#7C5CFF";
const GATHER_SOFT = "#F1EEFF";
const GATHER_INK = "#6A45E6";
// 일정(배당/실적) 정보성 슬레이트
const EVENT_INK = "#64748B";
const BRAND = "#2563EB";

// 달력 셀 배경 퍼즐(시그니처) — 날짜 뒤 중앙에 깔리는 조각. Material 'extension' path(viewBox 24).
const PUZZLE_PATH =
  "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z";
// 여러 종류 겹친 날 — 코너 뱃지 그라데이션
const BADGE_GRAD = "linear-gradient(135deg,#F04452,#7C5CFF,#3182F6)";

const EVENT_LABELS: Record<StockEventType, string> = {
  RECOMMEND: "추천",
  DIVIDEND: "배당",
  EARNINGS: "실적",
};

const LIST_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const LIST_VARIANTS_REDUCED = {
  hidden: {},
  show: {},
};
const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 5 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] } },
};
const ITEM_VARIANTS_REDUCED = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.12 } },
};

// ── 글리프/아이콘 ──────────────────────────────────────────────
function PuzzleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M7 2.5a2 2 0 0 1 4 0c0 .5.3.6.7.6H14a1 1 0 0 1 1 1v2.2c0 .4.2.7.6.7a2 2 0 0 1 0 4c-.4 0-.6.3-.6.7V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.3c.4 0 .7-.1.7-.5z" />
    </svg>
  );
}
// ── 모으기(자동적립) 날짜 전개 — 표시월 평일 스케줄 기준 ───────
// 백엔드 실행내역 대신 활성 종목의 period/periodDay를 그 달에 펼쳐 표시한다(평일만).
function buildGatherMap(
  stocks: AutoInvestStock[],
  month: Date,
): Map<string, AutoInvestStock[]> {
  const map = new Map<string, AutoInvestStock[]>();
  const year = month.getFullYear();
  const mon = month.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const active = stocks.filter((s) => s.isActive);
  if (active.length === 0) return map;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, mon, day);
    const dow = date.getDay(); // 0=일 … 6=토
    if (dow === 0 || dow === 6) continue; // 평일만
    const hits = active.filter((s) => {
      if (s.period === "DAILY") return true;
      if (s.period === "WEEKLY") return s.periodDay === dow; // periodDay 1~5(월~금)=dow 1~5
      if (s.period === "MONTHLY") return s.periodDay === day;
      return false;
    });
    if (hits.length) map.set(format(date, "yyyy-MM-dd"), hits);
  }
  return map;
}

/** 그 날 모으기 금액 — 통화별 합(금액형 종목만). 빈 배열이면 금액 미정(수량형).
 *  통화 구분 없이 합산하면 USD 적립이 KRW로 둔갑하므로 currency로 묶어 Decimal 합산. */
function gatherAmountByCurrency(
  stocks: AutoInvestStock[],
): { currency: string; amount: Decimal }[] {
  const byCur = new Map<string, Decimal>();
  for (const s of stocks) {
    if (s.amountType !== "AMOUNT" || s.buyAmount === null) continue;
    const cur = s.currency || "KRW";
    byCur.set(cur, (byCur.get(cur) ?? new Decimal(0)).plus(s.buyAmount));
  }
  return [...byCur.entries()]
    .filter(([, amt]) => amt.gt(0))
    .map(([currency, amount]) => ({ currency, amount }));
}

/** 통화별 모으기 금액 포맷 — USD는 $·소수 2자리, 그 외(KRW)는 원·정수. */
function formatGatherAmount(currency: string, amount: Decimal): string {
  return currency === "USD"
    ? `+${formatUSD(amount.toString())}`
    : `+${formatKRW(amount.toString())}`;
}
/** 모으기 표시 이름: 1종목이면 종목명, 여러 개면 "자동적립 N종목" */
function gatherName(stocks: AutoInvestStock[]): string {
  if (stocks.length === 1 && stocks[0]) return stocks[0].stockName;
  return `자동적립 ${stocks.length}종목`;
}

export function StockCalendarTab() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [lens, setLens] = useState<CalendarLens>("all");

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

  // ── 모으기(자동적립) — 종합조회 스케줄을 표시월 평일에 전개 ──
  const autoInvestQ = useAutoInvestSummary();
  const gatherMap = buildGatherMap(
    autoInvestQ.data?.stocks ?? [],
    calendarMonth,
  );

  // ── 보유주식 총 수익률 (포트폴리오 페이지와 동일하게 decimal.js 계산) ──
  const holdingsQ = useHoldings();
  const holdings = holdingsQ.data ?? [];
  const summaryQ = usePortfolioSummary();

  // ── 이번 달 거래(매수/매도) — 주문내역(useOrders)에서 ──
  const ordersQ = useOrders();
  const monthTrades = (ordersQ.data ?? [])
    .filter((o) => {
      // 체결된 거래만(REJECTED·PENDING·QUEUED 제외). AMOUNT 주문은 quantity=null이라 수량 필터 금지
      if (o.status !== "FILLED") return false;
      const d = parseUTC(o.createdAt);
      return (
        d.getFullYear() === calendarMonth.getFullYear() &&
        d.getMonth() === calendarMonth.getMonth()
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // 보유·이벤트·주문 종목 통합 코드셋 — 로고/이름 단일 detailMap 소스
  const allCodes = [
    ...new Set([
      ...holdings.map((h) => h.stockCode),
      ...events.map((e) => e.stockCode),
      ...(ordersQ.data ?? []).map((o) => o.stockCode),
      ...(autoInvestQ.data?.stocks ?? []).map((s) => s.stockCode),
    ]),
  ];
  const detailQueries = useStockDetails(allCodes);
  const detailMap = new Map<string, StockDetail>();
  allCodes.forEach((c, i) => {
    const d = detailQueries[i]?.data;
    if (d) detailMap.set(c, d);
  });

  // 보유주식 총 수익률·평가손익은 백엔드 summary 단일소스(total = 환산 KRW, HALF_UP).
  // 직접 holdings×현재가로 합산하면 ① 홈과 반올림이 어긋나고(999 vs 1,000) ② 해외(USD)를
  // 원화로 환산하지 않아 통화가 섞인다. 집계는 PortfolioSummaryService가 단독 책임.
  const summaryTotal = summaryQ.data?.total;
  const returnLoading = summaryQ.isLoading;
  const totalProfit =
    summaryTotal !== undefined && summaryTotal.profitKrw !== null
      ? toDecimal(summaryTotal.profitKrw)
      : null;
  const totalRate =
    summaryTotal !== undefined && summaryTotal.profitRate !== null
      ? toDecimal(summaryTotal.profitRate)
      : null;
  const hasSummaryTotal = totalProfit !== null && totalRate !== null;
  const hasHoldings = holdings.length > 0;

  // 날짜별 매수/매도 유무 + 실제 주문 수 (달력 마커용)
  const tradeMap = new Map<string, { buy: boolean; sell: boolean; count: number }>();
  monthTrades.forEach((o) => {
    const key = format(parseUTC(o.createdAt), "yyyy-MM-dd");
    const cur = tradeMap.get(key) ?? { buy: false, sell: false, count: 0 };
    if (o.side === "SELL") cur.sell = true;
    else cur.buy = true;
    cur.count++;
    tradeMap.set(key, cur);
  });

  const changeMonth = (m: Date) => {
    setCalendarMonth(m);
    setSelectedDate(new Date(m.getFullYear(), m.getMonth(), 1));
    setViewMode("month");
  };

  // 날짜 클릭: 처음 누르면 그 날 카드 노출, 같은 날 다시 누르면 닫힘 (가계부 탭과 동일)
  const handleSelectDate = (date: Date) => {
    if (viewMode === "day" && isSameDay(date, selectedDate)) {
      setViewMode("month");
    } else {
      setSelectedDate(date);
      setViewMode("day");
    }
  };

  const today = startOfDay(new Date());

  // ── 선택한 날 항목(거래 + 모으기 + 일정) — 히어로 카드용 ──
  const selKey = format(selectedDate, "yyyy-MM-dd");
  const selTrades = lens === "gather" || lens === "event" ? [] : monthTrades.filter((o) =>
    isSameDay(parseUTC(o.createdAt), selectedDate),
  );
  const selGather = lens === "trade" || lens === "event" ? [] : (gatherMap.get(selKey) ?? []);
  const selEvents = lens === "trade" || lens === "gather" ? [] : (eventMap.get(selKey) ?? []);
  const selCount = selTrades.length + selGather.length + selEvents.length;

  return (
    <div>
      {/* ── 상단 요약 (월 네비 + 총 수익률) — 가계부 탭과 동일 레이아웃 ── */}
      <div className="mb-3 mt-4">
        <div className="flex h-[42px] items-center justify-between gap-2">
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

          {/* 총 수익률 — 월 네비 행 우측, 두 줄(라벨 / 수익률·금액). 탭 시 포트폴리오 */}
          <button
            type="button"
            onClick={() => router.push("/portfolio")}
            className="flex flex-col items-end gap-0.5"
          >
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              내 보유주식 수익률
              <ChevronRight className="size-3" />
            </span>
            {returnLoading ? (
              <span className="font-numeric text-xs text-muted-foreground">
                계산 중...
              </span>
            ) : hasHoldings && hasSummaryTotal && totalRate !== null && totalProfit !== null ? (
              <div className="flex items-baseline gap-1.5">
                <ChangeIndicator value={totalRate.toNumber()} percent size="sm" />
                <span className="font-numeric text-[11px] text-muted-foreground">
                  {totalProfit.gte(0) ? "+" : "-"}
                  {formatKRW(totalProfit.abs().toString())}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">보유 종목 없음</span>
            )}
          </button>
        </div>

        {/* h-[52px] 고정 슬롯: 가계부 탭 요약 블록과 동일 높이 → 달력 시작 y 정렬.
            증권 탭은 이 자리에 필터(렌즈)를 둔다(수익률은 위 월 네비 행으로 올림).
            items-end: 필터를 슬롯 아래로 붙여 달력과의 간격↓·위 간격↑ (정렬은 유지) */}
        <div className="flex h-[52px] items-end">
          <CalendarFilterBar value={lens} onChange={setLens} />
        </div>
      </div>

      {/* ── 달력 ── */}
      <FinanceCalendar
        month={calendarMonth}
        onMonthChange={changeMonth}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        showHeader={false}
        className="pt-4"
        renderDay={(date, isCurrentMonth) => {
          if (!isCurrentMonth) return <span />;

          const key = format(date, "yyyy-MM-dd");
          const dayEvents = eventMap.get(key);
          const trade = tradeMap.get(key);
          const gather = gatherMap.get(key);
          const hasBuy = !!trade?.buy;
          const hasSell = !!trade?.sell;
          const hasGather = !!gather?.length;
          const hasEvent = !!dayEvents?.length;
          const isFuture = isAfter(startOfDay(date), today);
          // 링은 항상 selectedDate(기본=오늘) 따라감 — 진입 시 오늘 테두리 표시(가계부와 동일).
          // 카드만 viewMode로 게이트(클릭 시 노출).
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);

          // 렌즈 매칭 — 매칭 날만 퍼즐 표시, 비매칭은 흐리게(날짜만)
          const matches =
            lens === "all"
              ? hasBuy || hasSell || hasGather || hasEvent
              : lens === "trade"
                ? hasBuy || hasSell
                : lens === "gather"
                  ? hasGather
                  : hasEvent;
          const faded = lens !== "all" && !matches;

          // 렌즈별 개수 (전체=거래수+모으기종목수+일정수 / 거래=주문수 / 모으기=종목수 / 일정=일정수)
          const tradeCount = trade?.count ?? 0;
          const catCount =
            (hasBuy || hasSell ? 1 : 0) + (hasGather ? 1 : 0) + (hasEvent ? 1 : 0);
          const count =
            lens === "all"
              ? tradeCount + (gather?.length ?? 0) + (dayEvents?.length ?? 0)
              : lens === "trade"
                ? tradeCount
                : lens === "gather"
                  ? (gather?.length ?? 0)
                  : (dayEvents?.length ?? 0);

          // 배경 퍼즐 소프트색 / 코너 뱃지 강조색 — 미래는 회색, 여러 종류는 그라데이션
          const softFill = isFuture
            ? "#EEF0F3"
            : lens === "gather"
              ? "#E5DCFF"
              : lens === "event"
                ? "#E6EBF1"
                : lens === "trade"
                  ? hasBuy && hasSell
                    ? "#ECE6FB"
                    : hasBuy
                      ? "#FBD7DB"
                      : "#D9E6FB"
                  : catCount > 1
                    ? "#ECE6FB"
                    : hasGather
                      ? "#E5DCFF"
                      : hasBuy
                        ? "#FBD7DB"
                        : hasSell
                          ? "#D9E6FB"
                          : "#E6EBF1";
          const badgeBg = isFuture
            ? "#C2C8D0"
            : lens === "gather"
              ? GATHER
              : lens === "event"
                ? EVENT_INK
                : lens === "trade"
                  ? hasBuy && hasSell
                    ? BADGE_GRAD
                    : hasBuy
                      ? TRADE_BUY
                      : TRADE_SELL
                  : catCount > 1
                    ? BADGE_GRAD
                    : hasGather
                      ? GATHER
                      : hasBuy
                        ? TRADE_BUY
                        : hasSell
                          ? TRADE_SELL
                          : EVENT_INK;

          // 날짜 숫자 색 (가계부 탭과 동일 규칙) — 오늘만 파랑 볼드
          const dow = date.getDay();
          const dateColor =
            isFuture && !matches
              ? "#B5BBC3"
              : isToday
                ? BRAND
                : dow === 0
                  ? "#F2696B"
                  : dow === 6
                    ? "#1D4ED8"
                    : "#1A1D23";

          return (
            <span
              className={cn(
                "relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-[14px] bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-opacity",
                isSelected && "ring-1 ring-[#0471E9]",
              )}
              style={{ opacity: faded ? 0.3 : 1 }}
            >
              {/* 배경 퍼즐 — 날짜 뒤 중앙 (활동/렌즈 매칭 시) */}
              {matches && (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 size-[30px] -translate-x-1/2 -translate-y-1/2"
                >
                  <path d={PUZZLE_PATH} fill={softFill} />
                </svg>
              )}

              <span
                className={cn(
                  "font-numeric relative z-[1] text-[11px] leading-none",
                  isToday && "font-bold",
                )}
                style={{ color: dateColor }}
              >
                {date.getDate()}
              </span>

              {/* 코너 개수 뱃지 — 퍼즐 우상단 */}
              {matches && count > 0 && (
                <span
                  className="font-numeric absolute right-1 top-1 z-[2] flex h-[13px] min-w-[13px] items-center justify-center rounded-full px-[3px] text-[8px] font-extrabold leading-none text-white shadow-[0_0_0_1.5px_#fff]"
                  style={{ background: badgeBg }}
                >
                  {count}
                </span>
              )}
            </span>
          );
        }}
        legend={
          <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1.5 text-[11px] text-muted-foreground">
            {([
              { label: "매수", color: TRADE_BUY },
              { label: "매도", color: TRADE_SELL },
              { label: "모으기", color: GATHER },
              { label: "종목 일정", color: EVENT_INK },
            ] as const).map(({ label, color }) => (
              <span key={label} className="flex items-center gap-0.5">
                <svg viewBox="0 0 24 24" width={10} height={10} fill={color} aria-hidden>
                  <path d={PUZZLE_PATH} />
                </svg>
                {label}
              </span>
            ))}
          </div>
        }
      />

      {/* ── 선택한 날 카드 (히어로) — 날짜 클릭 시에만 노출 (가계부 탭과 동일) ── */}
      <AnimatePresence>
        {viewMode === "day" && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="mt-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {format(selectedDate, "M월 d일 (eee)", { locale: ko })}
              </p>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className="-my-2 -mr-1 flex items-center gap-0.5 py-2 pr-1 text-xs text-muted-foreground"
              >
                <X className="size-3.5" />
                닫기
              </button>
            </div>

            {selCount === 0 ? (
              <EmptyState title="이 날은 거래·일정이 없어요" />
            ) : (
              <motion.div
                key={selKey}
                className="divide-y divide-border/50"
                variants={reduceMotion ? LIST_VARIANTS_REDUCED : LIST_VARIANTS}
                initial="hidden"
                animate="show"
              >
                {selTrades.map((o) => (
                  <motion.div key={o.orderId} variants={reduceMotion ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS}>
                    <TimelineTradeRow order={o} detail={detailMap.get(o.stockCode)} />
                  </motion.div>
                ))}
                {selGather.map((stock) => (
                  <motion.div key={stock.stockCode} variants={reduceMotion ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS}>
                    <TimelineGatherRow stocks={[stock]} detailMap={detailMap} />
                  </motion.div>
                ))}
                {selEvents.map((e) => (
                  <motion.div key={`${e.eventDate}-${e.stockCode}-${e.eventType}`} variants={reduceMotion ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS}>
                    <TimelineEventRow
                      event={e}
                      isFuture={isAfter(startOfDay(selectedDate), today)}
                      detail={detailMap.get(e.stockCode)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ── 히어로 카드 타임라인 행 ────────────────────────────────────
function tradeDetail(order: OrderHistoryItem): string | null {
  const quantity = toDecimal(order.quantity);
  const hasQty = quantity.gt(0);
  const hasPrice = order.price !== null && order.price !== undefined;
  const fmtMoney = (v: number | string | null | undefined) =>
    order.currency === "USD" ? formatUSD(v) : formatKRW(v);
  // 금액(AMOUNT) 주문은 요청액(orderAmount)이 아니라 실제 체결액(filledAmount)을 우선 표시
  // — 부분 배분·소수점 체결에서 둘이 달라질 수 있어 filledAmount가 원천값.
  const settledAmount = order.filledAmount ?? order.orderAmount;
  const amountText = settledAmount !== null ? fmtMoney(settledAmount) : null;
  return hasQty
    ? [`${quantity.toString()}주`, hasPrice ? fmtMoney(order.price) : null]
        .filter(Boolean)
        .join(" · ")
    : amountText;
}

function StockAvatar({ detail, stockCode }: { detail?: StockDetail | undefined; stockCode: string }) {
  const name = detail?.stockName ?? stockCode;
  return (
    <Avatar className="size-10 rounded-xl">
      {detail?.logoUrl && <AvatarImage src={detail.logoUrl} alt={name} />}
      <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
        {name.trim().charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function TimelineTradeRow({
  order,
  detail,
}: {
  order: OrderHistoryItem;
  detail?: StockDetail | undefined;
}) {
  const isBuy = order.side !== "SELL";
  const color = isBuy ? TRADE_BUY : TRADE_SELL;
  const name = detail?.stockName ?? order.stockCode;
  const amount = tradeDetail(order);
  return (
    <div className="flex items-center gap-3.5 py-3">
      <StockAvatar detail={detail} stockCode={order.stockCode} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isBuy ? "매수" : "매도"}
        </p>
      </div>
      {amount && (
        <span
          className="font-numeric shrink-0 text-sm font-bold"
          style={{ color }}
        >
          {amount}
        </span>
      )}
    </div>
  );
}

function TimelineGatherRow({ stocks, detailMap }: { stocks: AutoInvestStock[]; detailMap: Map<string, StockDetail> }) {
  const amounts = gatherAmountByCurrency(stocks);
  const single = stocks.length === 1 ? stocks[0] : undefined;
  return (
    <div className="flex items-center gap-3.5 py-3">
      {single ? (
        <StockAvatar detail={detailMap.get(single.stockCode)} stockCode={single.stockCode} />
      ) : (
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: GATHER_SOFT, color: GATHER_INK }}
        >
          <PuzzleIcon className="size-[17px]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {gatherName(stocks)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">모으기</p>
      </div>
      <span
        className="font-numeric shrink-0 text-sm font-bold"
        style={{ color: GATHER_INK }}
      >
        {amounts.length > 0
          ? amounts.map((a) => formatGatherAmount(a.currency, a.amount)).join(" ")
          : null}
      </span>
    </div>
  );
}

function TimelineEventRow({
  event,
  isFuture,
  detail,
}: {
  event: StockEvent;
  isFuture: boolean;
  detail?: StockDetail | undefined;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3">
      <StockAvatar detail={detail} stockCode={event.stockCode} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {event.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {EVENT_LABELS[event.eventType] ?? "일정"}
        </p>
      </div>
      {isFuture && (
        <span className="shrink-0 text-sm font-medium" style={{ color: EVENT_INK }}>
          예정
        </span>
      )}
    </div>
  );
}

