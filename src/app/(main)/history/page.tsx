"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import {
  ListSkeleton,
  fmtMoney,
  fmtTime,
  shortDateHeader,
  isInMonth,
} from "@/components/features/history/shared";
import { useOrders } from "@/hooks/queries/useOrders";
import { usePendingOrders } from "@/hooks/queries/usePendingOrders";
import { useSecuritiesAccounts } from "@/hooks/queries/useSecuritiesAccounts";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { useCancelOrder } from "@/hooks/mutations/useCancelOrder";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { StockDetail } from "@/types/domain/trading";
import type { OrderHistoryItem } from "@/types/domain/order";
import type { SecuritiesAccountStatus } from "@/types/domain/account";

// ── 타입 ────────────────────────────────────────────────────────────────────

type MainTab = "trades" | "profit" | "pending";
type MarketFilter = "all" | "DOMESTIC" | "OVERSEAS";
type SideFilter = "all" | "BUY" | "SELL";

// ── 월 목록 (최근 13개월) ────────────────────────────────────────────────────

function buildMonths() {
  const result: { year: number; month: number; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${d.getMonth() + 1}월`,
    });
  }
  return result;
}
const MONTHS = buildMonths();

// ── P&L 계산 ────────────────────────────────────────────────────────────────

function calcPnL(o: OrderHistoryItem): Decimal | null {
  if (!o.avgBuyPriceAtSell || !o.quantity) return null;
  const qty = toDecimal(o.quantity);
  const fillAmt = o.price
    ? toDecimal(o.price).times(qty)
    : toDecimal(o.filledAmount ?? 0);
  const cost = toDecimal(o.avgBuyPriceAtSell).times(qty);
  return fillAmt.minus(cost);
}

// ── 날짜 그룹 (연도 없음) ────────────────────────────────────────────────────

function groupByDateShort<T>(items: T[], getIso: (t: T) => string) {
  const map = new Map<string, { header: string; rows: T[] }>();
  for (const it of items) {
    const iso = getIso(it);
    const d = new Date(iso);
    const key = isNaN(d.getTime())
      ? iso.slice(0, 10)
      : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const group = map.get(key) ?? { header: shortDateHeader(iso), rows: [] as T[] };
    group.rows.push(it);
    map.set(key, group);
  }
  return [...map.values()];
}

// ── 계좌 카드 (마켓 셀렉터) ──────────────────────────────────────────────────

const POCKET_LOGO = "/KOSPI-logo/055550_clean.jpg";

interface AccountCardProps {
  market: MarketFilter;
  onChange: (m: MarketFilter) => void;
  accounts: SecuritiesAccountStatus[];
  showKrw?: boolean;
  onToggle?: (v: boolean) => void;
}

function AccountCard({ market, onChange, accounts, showKrw, onToggle }: AccountCardProps) {
  const [open, setOpen] = useState(false);

  const domestic = accounts.find((a) => a.type === "DOMESTIC");
  const overseas = accounts.find((a) => a.type === "OVERSEAS");

  // 카드에 표시할 텍스트
  const { title, subtitle } =
    market === "DOMESTIC" && domestic
      ? { title: "국내 위탁계좌", subtitle: domestic.accountNo }
      : market === "OVERSEAS" && overseas
        ? { title: "해외 위탁계좌", subtitle: overseas.accountNo }
        : {
            title: "전체 계좌",
            subtitle: [domestic && "국내", overseas && "해외"].filter(Boolean).join(" · "),
          };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* 카드 전체 클릭 → 시트 오픈 / 토글만 stopPropagation */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        className="flex items-center gap-3.5 rounded-2xl border border-border px-4 py-3.5 transition-colors active:bg-muted/40 cursor-pointer"
      >
        {/* 로고 */}
        <div className="size-10 shrink-0 overflow-hidden rounded-full border border-border/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={POCKET_LOGO} alt="PocketStock" className="size-full object-cover" />
        </div>

        {/* 계좌 정보 */}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{title}</p>
          {subtitle && (
            <p className="font-numeric mt-0.5 truncate text-[13px] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* 원화/달러 토글 — 해외 위탁계좌일 때만, 화살표 왼쪽 */}
        {market === "OVERSEAS" && onToggle && (
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <CurrencyToggle checked={showKrw ?? false} onChange={onToggle} />
          </div>
        )}

        {/* 드롭다운 화살표 */}
        <ChevronDown
          className={cn(
            "size-4.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </div>

      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-safe">
        <SheetHeader className="px-5 pb-1 pt-4">
          <SheetTitle className="text-left text-base font-bold">계좌 선택</SheetTitle>
        </SheetHeader>

        <div className="divide-y divide-border/50 px-5 pb-4 pt-1">
          {/* 전체 */}
          <AccountOption
            logo={POCKET_LOGO}
            title="전체 계좌"
            subtitle={[domestic && "국내", overseas && "해외"].filter(Boolean).join(" · ")}
            active={market === "all"}
            onClick={() => { onChange("all"); setOpen(false); }}
          />

          {/* 국내 */}
          {domestic && (
            <AccountOption
              logo={POCKET_LOGO}
              title="국내 위탁계좌"
              subtitle={domestic.accountNo}
              active={market === "DOMESTIC"}
              onClick={() => { onChange("DOMESTIC"); setOpen(false); }}
            />
          )}

          {/* 해외 */}
          {overseas && (
            <AccountOption
              logo={POCKET_LOGO}
              title="해외 위탁계좌"
              subtitle={overseas.accountNo}
              active={market === "OVERSEAS"}
              onClick={() => { onChange("OVERSEAS"); setOpen(false); }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AccountOption({
  logo,
  title,
  subtitle,
  active,
  onClick,
}: {
  logo: string;
  title: string;
  subtitle?: string | undefined;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 py-4"
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-full border border-border/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("text-[15px]", active ? "font-bold text-foreground" : "font-medium text-foreground")}>
          {title}
        </p>
        {subtitle && (
          <p className="font-numeric mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {active && <Check className="size-4.5 shrink-0 text-brand" />}
    </button>
  );
}

// ── 탭 바 ────────────────────────────────────────────────────────────────────

interface TabBarProps {
  active: MainTab;
  onChange: (t: MainTab) => void;
  pendingCount: number;
}

function TabBar({ active, onChange, pendingCount }: TabBarProps) {
  const tabs: { id: MainTab; label: string }[] = [
    { id: "trades", label: "거래내역" },
    { id: "profit", label: "판매수익" },
    { id: "pending", label: "미체결" },
  ];
  return (
    <div className="flex border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "relative flex items-center gap-1.5 px-4 pb-3 pt-1 text-[15px] font-medium transition-colors",
            active === t.id ? "text-brand font-semibold" : "text-muted-foreground",
          )}
        >
          {t.label}
          {t.id === "pending" && pendingCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
          {active === t.id && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── 원화/달러 토글 ───────────────────────────────────────────────────────────

function CurrencyToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "원화로 보기 (켜짐)" : "원화로 보기 (꺼짐)"}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        checked ? "bg-brand" : "bg-muted",
      )}
    >
      <span className={cn(
        "flex size-5 items-center justify-center rounded-full bg-white font-numeric text-[10px] font-bold shadow-sm transition-transform duration-200 ease-out",
        checked ? "translate-x-5 text-brand" : "translate-x-0 text-muted-foreground",
      )}>
        {checked ? "₩" : "$"}
      </span>
    </button>
  );
}

// ── 월 네비 + 사이드 필터 ────────────────────────────────────────────────────

interface MonthFilterRowProps {
  month: { year: number; month: number };
  onMonth: (m: { year: number; month: number }) => void;
  showSide?: boolean;
  side?: SideFilter;
  onSide?: (s: SideFilter) => void;
}

function MonthFilterRow({ month, onMonth, showSide, side, onSide }: MonthFilterRowProps) {
  const now = new Date();
  const isLatest = month.year === now.getFullYear() && month.month === now.getMonth() + 1;
  const oldest = MONTHS[MONTHS.length - 1] ?? MONTHS[0];
  const isOldest = month.year === oldest?.year && month.month === oldest?.month;

  function go(delta: number) {
    const d = new Date(month.year, month.month - 1 + delta, 1);
    onMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  return (
    <div className="flex items-center justify-between pb-2 pt-3">
      {/* 매수/매도 필터 (거래내역 탭만) */}
      {showSide && onSide ? (
        <SegmentedControl
          options={[
            { label: "전체", value: "all" },
            { label: "매수", value: "BUY" },
            { label: "매도", value: "SELL" },
          ]}
          value={side ?? "all"}
          onChange={onSide}
          className="max-w-[180px]"
        />
      ) : (
        <span />
      )}

      {/* ← 6월 → */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={isOldest}
          className="p-0.5 disabled:opacity-30"
          aria-label="이전 달"
        >
          <ChevronLeft className="size-4.5 text-muted-foreground" />
        </button>
        <span className="min-w-[36px] text-center text-[14px] font-bold text-foreground">
          {month.month}월
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={isLatest}
          className="p-0.5 disabled:opacity-30"
          aria-label="다음 달"
        >
          <ChevronRight className="size-4.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ── 주식 아바타 ──────────────────────────────────────────────────────────────

function StockAvatar({ detail, stockCode }: { detail?: StockDetail | undefined; stockCode: string }) {
  const name = detail?.stockName ?? stockCode;
  return (
    <Avatar className="size-9 rounded-xl">
      {detail?.logoUrl && <AvatarImage src={detail.logoUrl} alt={name} />}
      <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
        {name.trim().charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

// ── 거래내역 탭 ──────────────────────────────────────────────────────────────

interface TradesTabProps {
  orders: OrderHistoryItem[];
  detailMap: Map<string, StockDetail>;
  isLoading: boolean;
  isError: boolean;
  market: MarketFilter;
  month: { year: number; month: number };
  side: SideFilter;
  showKrw: boolean;
  fxRate: number | null;
}

function TradesTab({ orders, detailMap, isLoading, isError, market, month, side, showKrw, fxRate }: TradesTabProps) {
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // PENDING/QUEUED는 미체결 탭에만 표시 — 거래내역은 완료(FILLED·REJECTED) 주문만
      if (o.status === "PENDING" || o.status === "QUEUED") return false;
      if (!isInMonth(o.createdAt, month.year, month.month)) return false;
      if (market === "DOMESTIC" && o.currency !== "KRW") return false;
      if (market === "OVERSEAS" && o.currency !== "USD") return false;
      if (side !== "all" && o.side !== side) return false;
      return true;
    });
  }, [orders, market, month, side]);

  const groups = groupByDateShort(filtered, (o) => o.createdAt);

  if (isLoading) return <ListSkeleton />;
  if (isError) return <EmptyState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." className="py-16" />;
  if (filtered.length === 0) return <EmptyState title="거래 내역이 없어요" className="py-16" />;

  return (
    <div>
      {groups.map((g, gi) => (
        <div key={g.header} className={cn(gi > 0 && "mt-4 border-t border-border/60 pt-4")}>
          <p className="mb-2 text-[12px] font-medium text-muted-foreground">{g.header}</p>
          <div>
            {g.rows.map((o) => {
              const detail = detailMap.get(o.stockCode);
              const name = detail?.stockName ?? o.stockCode;
              const isBuy = o.side === "BUY";
              const isRejected = o.status === "REJECTED" || o.status === "CANCELLED";
              const qty = toDecimal(o.quantity ?? 0);
              const fillAmt = o.price
                ? toDecimal(o.price).times(qty)
                : toDecimal(o.filledAmount ?? 0);
              const isPending = o.status === "PENDING" || o.status === "QUEUED";
              return (
                <div key={o.orderId} className="flex items-center gap-3 py-3">
                  <StockAvatar detail={detail} stockCode={o.stockCode} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-[14px] font-semibold", isRejected ? "text-muted-foreground" : "text-foreground")}>{name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {isBuy ? "매수" : "매도"} · {fmtTime(o.createdAt)}
                      {isPending && (
                        <span className="ml-1.5 text-brand">대기중</span>
                      )}
                      {o.status === "REJECTED" && (
                        <span className="ml-1.5 text-destructive">거절</span>
                      )}
                      {o.status === "CANCELLED" && (
                        <span className="ml-1.5 text-muted-foreground">취소</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn(
                      "font-numeric text-[14px] font-bold",
                      isRejected ? "text-muted-foreground line-through" : isBuy ? "text-up" : "text-down",
                    )}>
                      {isBuy ? "+" : "−"}{qty.toDecimalPlaces(4).toString()}주
                    </p>
                    {!isRejected && fillAmt.gt(0) && (() => {
                      const isUsd = o.currency === "USD";
                      const krwAmt = isUsd && showKrw && fxRate
                        ? fillAmt.times(toDecimal(fxRate))
                        : null;
                      return krwAmt ? (
                        <>
                          <p className="font-numeric text-[12px] text-muted-foreground">
                            ≈ {formatKRW(krwAmt.toDecimalPlaces(0).toString())}
                          </p>
                          <p className="font-numeric text-[11px] text-muted-foreground/60">
                            {formatUSD(fillAmt.toDecimalPlaces(2).toString())}
                          </p>
                        </>
                      ) : (
                        <p className="font-numeric text-[12px] text-muted-foreground">
                          {fmtMoney(o.currency, fillAmt.toDecimalPlaces(isUsd ? 2 : 0))}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 판매수익 탭 ──────────────────────────────────────────────────────────────

interface ProfitTabProps {
  orders: OrderHistoryItem[];
  detailMap: Map<string, StockDetail>;
  isLoading: boolean;
  isError: boolean;
  market: MarketFilter;
  month: { year: number; month: number };
  showKrw: boolean;
}

function ProfitTab({ orders, detailMap, isLoading, isError, market, month, showKrw }: ProfitTabProps) {
  const sells = useMemo(() => {
    return orders.filter((o) => {
      if (o.side !== "SELL" || o.status !== "FILLED") return false;
      if (!isInMonth(o.createdAt, month.year, month.month)) return false;
      if (market === "DOMESTIC" && o.currency !== "KRW") return false;
      if (market === "OVERSEAS" && o.currency !== "USD") return false;
      return true;
    });
  }, [orders, market, month]);

  const isOverseasOnly = market === "OVERSEAS";

  const totalPnLKrw = useMemo(() => {
    return sells.reduce((sum, o) => {
      const pnl = calcPnL(o);
      if (!pnl) return sum;
      if (o.currency === "USD") {
        return o.fxRateAtFill ? sum.plus(pnl.times(toDecimal(o.fxRateAtFill))) : sum;
      }
      return sum.plus(pnl);
    }, new Decimal(0));
  }, [sells]);

  const totalPnLUsd = useMemo(() => {
    if (!isOverseasOnly) return new Decimal(0);
    return sells.reduce((sum, o) => {
      const pnl = calcPnL(o);
      return pnl ? sum.plus(pnl) : sum;
    }, new Decimal(0));
  }, [sells, isOverseasOnly]);

  const hasPnL = sells.some((o) => o.avgBuyPriceAtSell !== null && o.avgBuyPriceAtSell !== undefined);
  const groups = groupByDateShort(sells, (o) => o.createdAt);

  if (isLoading) return <ListSkeleton />;
  if (isError) return <EmptyState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." className="py-16" />;

  return (
    <div>
      {/* 월 손익 요약 */}
      <div className="pb-4 pt-1">
        <p className="text-[13px] text-muted-foreground">
          {month.month}월 {isOverseasOnly ? "해외 " : market === "DOMESTIC" ? "국내 " : ""}판매수익
        </p>
        {isOverseasOnly ? (
          <>
            {showKrw && hasPnL ? (
              <>
                <p className={cn(
                  "font-numeric mt-1 text-[28px] font-bold tracking-tight",
                  totalPnLKrw.gt(0) ? "text-up" : totalPnLKrw.lt(0) ? "text-down" : "text-foreground",
                )}>
                  {totalPnLKrw.gt(0) ? "+" : ""}{formatKRW(totalPnLKrw.toFixed(0))}
                </p>
                <p className="font-numeric text-[13px] text-muted-foreground">
                  {totalPnLUsd.gt(0) ? "+" : ""}{formatUSD(totalPnLUsd.toFixed(2))} (원화 환산)
                </p>
              </>
            ) : (
              <>
                <p className={cn(
                  "font-numeric mt-1 text-[28px] font-bold tracking-tight",
                  totalPnLUsd.gt(0) ? "text-up" : totalPnLUsd.lt(0) ? "text-down" : "text-foreground",
                )}>
                  {totalPnLUsd.gt(0) ? "+" : ""}{formatUSD(totalPnLUsd.toFixed(2))}
                </p>
                {hasPnL && (
                  <p className="font-numeric text-[13px] text-muted-foreground">
                    ≈ {totalPnLKrw.gt(0) ? "+" : ""}{formatKRW(totalPnLKrw.toFixed(0))} (환산)
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <p className={cn(
            "font-numeric mt-1 text-[28px] font-bold tracking-tight",
            totalPnLKrw.gt(0) ? "text-up" : totalPnLKrw.lt(0) ? "text-down" : "text-foreground",
          )}>
            {totalPnLKrw.gt(0) ? "+" : ""}{formatKRW(totalPnLKrw.toFixed(0))}
          </p>
        )}
      </div>

      <div className="h-px bg-border/60" />

      {sells.length === 0 ? (
        <EmptyState title="판매 내역이 없어요" className="py-14" />
      ) : (
        <div className="pt-4">
          {groups.map((g, gi) => (
            <div key={g.header} className={cn(gi > 0 && "mt-4 border-t border-border/60 pt-4")}>
              <p className="mb-2 text-[12px] font-medium text-muted-foreground">{g.header}</p>
              <div>
                {g.rows.map((o) => {
                  const detail = detailMap.get(o.stockCode);
                  const name = detail?.stockName ?? o.stockCode;
                  const qty = toDecimal(o.quantity ?? 0);
                  const pnl = calcPnL(o);
                  const pnlKrw =
                    pnl && o.currency === "USD" && o.fxRateAtFill
                      ? pnl.times(toDecimal(o.fxRateAtFill))
                      : null;
                  return (
                    <div key={o.orderId} className="flex items-center gap-3 py-3">
                      <StockAvatar detail={detail} stockCode={o.stockCode} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-foreground">{name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          매도 {qty.toDecimalPlaces(4).toString()}주 · {fmtTime(o.createdAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {pnl ? (
                          <>
                            <p className={cn(
                              "font-numeric text-[14px] font-bold",
                              pnl.gt(0) ? "text-up" : pnl.lt(0) ? "text-down" : "text-muted-foreground",
                            )}>
                              {pnl.gt(0) ? "+" : ""}
                              {o.currency === "USD"
                                ? formatUSD(pnl.toDecimalPlaces(2).toString())
                                : formatKRW(pnl.toDecimalPlaces(0).toString())}
                            </p>
                            {pnlKrw && (
                              <p className={cn(
                                "font-numeric text-[11px]",
                                pnlKrw.gt(0) ? "text-up/70" : pnlKrw.lt(0) ? "text-down/70" : "text-muted-foreground",
                              )}>
                                ≈ {pnlKrw.gt(0) ? "+" : ""}{formatKRW(pnlKrw.toDecimalPlaces(0).toString())}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="font-numeric text-[13px] text-muted-foreground">
                            {fmtMoney(
                              o.currency,
                              toDecimal(o.price ?? 0)
                                .times(qty)
                                .toDecimalPlaces(o.currency === "USD" ? 2 : 0),
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 미체결 탭 ────────────────────────────────────────────────────────────────

function PendingOrderItem({
  o,
  detail,
}: {
  o: OrderHistoryItem;
  detail?: StockDetail | undefined;
}) {
  const cancel = useCancelOrder();
  const name = detail?.stockName ?? o.stockCode;
  const isBuy = o.side === "BUY";
  const qty = toDecimal(o.quantity ?? 0);

  return (
    <div className="flex items-center gap-3 py-3">
      <StockAvatar detail={detail} stockCode={o.stockCode} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">{name}</p>
        <p className="text-[12px] text-muted-foreground">
          {isBuy ? "매수" : "매도"} · {fmtTime(o.createdAt)}
          {o.price && (
            <span className="font-numeric ml-1">
              @ {fmtMoney(o.currency, toDecimal(o.price).toDecimalPlaces(o.currency === "USD" ? 2 : 0))}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <p className={cn(
          "font-numeric text-[13px] font-semibold",
          isBuy ? "text-up" : "text-down",
        )}>
          {isBuy ? "+" : "−"}{qty.toDecimalPlaces(4).toString()}주
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 rounded-lg px-2.5 text-[12px] font-medium"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(o.orderId)}
        >
          {cancel.isPending ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : "취소"}
        </Button>
      </div>
    </div>
  );
}

interface PendingTabProps {
  orders: OrderHistoryItem[];
  detailMap: Map<string, StockDetail>;
  isLoading: boolean;
  isError: boolean;
  market: MarketFilter;
}

function PendingTab({ orders, detailMap, isLoading, isError, market }: PendingTabProps) {
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (market === "DOMESTIC" && o.currency !== "KRW") return false;
      if (market === "OVERSEAS" && o.currency !== "USD") return false;
      return true;
    });
  }, [orders, market]);

  const pending = filtered.filter((o) => o.status === "PENDING");
  const queued = filtered.filter((o) => o.status === "QUEUED");

  if (isLoading) return <ListSkeleton />;
  if (isError) return <EmptyState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." className="py-16" />;
  if (filtered.length === 0) return <EmptyState title="미체결 주문이 없어요" className="py-16" />;

  return (
    <div className="pt-2">
      {pending.length > 0 && (
        <div className={cn(queued.length > 0 && "mb-5")}>
          <p className="mb-2 text-[12px] font-medium text-muted-foreground">지정가 대기</p>
          <div>
            {pending.map((o) => (
              <PendingOrderItem key={o.orderId} o={o} detail={detailMap.get(o.stockCode)} />
            ))}
          </div>
        </div>
      )}
      {queued.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-medium text-muted-foreground">차수 대기</p>
          <div>
            {queued.map((o) => (
              <PendingOrderItem key={o.orderId} o={o} detail={detailMap.get(o.stockCode)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [tab, setTab] = useState<MainTab>("trades");
  const [market, setMarket] = useState<MarketFilter>("all");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [showKrw, setShowKrw] = useState(false);

  const ordersQ = useOrders();
  const pendingQ = usePendingOrders();
  const accountsQ = useSecuritiesAccounts();
  const fxRate = useExchangeRate().data?.baseRate ?? null;

  const orders = useMemo(
    () => (ordersQ.data ?? []).filter((o) => toDecimal(o.quantity ?? 0).gt(0)),
    [ordersQ.data],
  );
  const pendingOrders = useMemo(() => pendingQ.data ?? [], [pendingQ.data]);
  const accounts = useMemo(() => accountsQ.data ?? [], [accountsQ.data]);

  const codes = useMemo(
    () => [...new Set([...orders.map((o) => o.stockCode), ...pendingOrders.map((o) => o.stockCode)])],
    [orders, pendingOrders],
  );
  const detailQueries = useStockDetails(codes);
  const detailMap = useMemo(() => {
    const m = new Map<string, StockDetail>();
    codes.forEach((c, i) => {
      const d = detailQueries[i]?.data;
      if (d) m.set(c, d);
    });
    return m;
  }, [codes, detailQueries]);

  const handleTabChange = (t: MainTab) => {
    setTab(t);
    if (t !== "trades") setSideFilter("all");
  };

  const handleMarketChange = (m: MarketFilter) => {
    setMarket(m);
    if (m !== "OVERSEAS") setShowKrw(false);
  };

  return (
    <>
      <AppHeader variant="sub" title="내역 확인" sticky />

      {/* 계좌 카드 */}
      <div className="px-5 pb-4">
        <AccountCard
          market={market}
          onChange={handleMarketChange}
          accounts={accounts}
          showKrw={showKrw}
          onToggle={setShowKrw}
        />
      </div>

      {/* 탭 + 필터 — sticky */}
      <div className="sticky top-14 z-30 bg-background px-5 pt-1">
        <TabBar active={tab} onChange={handleTabChange} pendingCount={pendingOrders.length} />
        <MonthFilterRow
          month={month}
          onMonth={setMonth}
          showSide={tab === "trades"}
          side={sideFilter}
          onSide={setSideFilter}
        />
      </div>

      {/* 콘텐츠 */}
      <div className="px-5 pb-8 pt-4">
        {tab === "trades" && (
          <TradesTab
            orders={orders}
            detailMap={detailMap}
            isLoading={ordersQ.isLoading}
            isError={ordersQ.isError}
            market={market}
            month={month}
            side={sideFilter}
            showKrw={showKrw}
            fxRate={fxRate}
          />
        )}
        {tab === "profit" && (
          <ProfitTab
            orders={orders}
            detailMap={detailMap}
            isLoading={ordersQ.isLoading}
            isError={ordersQ.isError}
            market={market}
            month={month}
            showKrw={showKrw}
          />
        )}
        {tab === "pending" && (
          <PendingTab
            orders={pendingOrders}
            detailMap={detailMap}
            isLoading={pendingQ.isLoading}
            isError={pendingQ.isError}
            market={market}
          />
        )}
      </div>
    </>
  );
}
