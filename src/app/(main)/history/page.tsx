"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Percent,
  type LucideIcon,
} from "lucide-react";
import Decimal from "decimal.js";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrders } from "@/hooks/queries/useOrders";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useCmaTransactions } from "@/hooks/queries/useCmaTransactions";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { StockDetail } from "@/types/domain/trading";
import type { OrderHistoryItem } from "@/types/domain/order";
import type { CmaTransaction } from "@/types/domain/cma";

// ── 공통 helpers ────────────────────────────────────────────────────────────

type Tab = "trade" | "cma";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dateKey(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "오늘 · 2026.06.04" / "2026.06.03" */
function dateHeader(iso: string) {
  const d = new Date(iso);
  const key = dateKey(iso);
  return !isNaN(d.getTime()) && isSameDay(d, new Date()) ? `오늘 · ${key}` : key;
}

/** 최신순 입력 순서를 보존하며 날짜별 그룹핑 */
function groupByDate<T>(items: T[], getIso: (t: T) => string) {
  const map = new Map<string, { header: string; rows: T[] }>();
  for (const it of items) {
    const iso = getIso(it);
    const key = dateKey(iso);
    const group = map.get(key) ?? { header: dateHeader(iso), rows: [] as T[] };
    group.rows.push(it);
    map.set(key, group);
  }
  return [...map.values()];
}

const fmtMoney = (currency: string, value: Decimal | number | string) =>
  currency === "USD" ? formatUSD(value.toString()) : formatKRW(value.toString());

// 필터 칩
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-brand-surface px-4 py-3.5">
      <span className="text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-numeric text-base font-bold",
          valueClassName ?? "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DateGroup({ header, children }: { header: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 mt-4 px-1 text-[12px] text-muted-foreground">{header}</p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <div className="size-9 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2 text-right">
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-2.5 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 매매 내역 탭 ────────────────────────────────────────────────────────────

type TradeFilter = "all" | "BUY" | "SELL";

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(4).toString();
}

function TradeHistoryTab() {
  const [filter, setFilter] = useState<TradeFilter>("all");
  const ordersQ = useOrders();
  // 실제 체결 수량이 없는(0주) 내역은 제외.
  const orders = useMemo(
    () => (ordersQ.data ?? []).filter((o) => toDecimal(o.quantity).gt(0)),
    [ordersQ.data],
  );

  // 종목명/로고/현재가 보강 — 응답엔 stockCode만 있어 상세를 병렬 조회.
  const codes = useMemo(
    () => [...new Set(orders.map((o) => o.stockCode))],
    [orders],
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

  // 한 주문의 통화·체결금액(소수점은 price 비어 현재가로 추정).
  const amountOf = (o: OrderHistoryItem) => {
    const detail = detailMap.get(o.stockCode);
    const currency = detail?.currency ?? "KRW";
    const qty = toDecimal(o.quantity);
    const px = toDecimal(o.price);
    // 소수점 주문은 체결 전 price가 비어 현재가로 환산.
    const unit = px.gt(0) ? px : toDecimal(detail?.price.currentPrice);
    return { currency, amount: unit.times(qty) };
  };

  // 이번 달 총 매수 (KRW 매수 합계)
  const totalBuy = useMemo(() => {
    const now = new Date();
    return orders.reduce((sum, o) => {
      if (o.side !== "BUY") return sum;
      const d = new Date(o.createdAt);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())
        return sum;
      const { currency, amount } = amountOf(o);
      return currency === "KRW" ? sum.plus(amount) : sum;
    }, new Decimal(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, detailMap]);

  const filtered = orders.filter((o) =>
    filter === "all" ? true : o.side === filter,
  );
  const groups = groupByDate(filtered, (o) => o.createdAt);

  return (
    <>
      <div className="flex gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          전체
        </Chip>
        <Chip active={filter === "BUY"} onClick={() => setFilter("BUY")}>
          매수
        </Chip>
        <Chip active={filter === "SELL"} onClick={() => setFilter("SELL")}>
          매도
        </Chip>
      </div>

      <div className="mt-3">
        <SummaryCard
          label="이번 달 총 매수"
          value={formatKRW(totalBuy.toString())}
          valueClassName="text-up"
        />
      </div>

      {ordersQ.isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState title="매매 내역이 없어요" className="py-16" />
      ) : (
        <div>
          {groups.map((g) => (
            <DateGroup key={g.header} header={g.header}>
              {g.rows.map((o) => {
                const detail = detailMap.get(o.stockCode);
                const name = detail?.stockName ?? o.stockCode;
                const isBuy = o.side === "BUY";
                const qty = toDecimal(o.quantity);
                const { currency, amount } = amountOf(o);
                return (
                  <div key={o.orderId} className="flex items-center gap-3 py-3.5">
                    <Avatar className="size-9">
                      {detail?.logoUrl && (
                        <AvatarImage src={detail.logoUrl} alt={name} />
                      )}
                      <AvatarFallback className="text-[11px]">
                        {name.trim().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {name} {isBuy ? "매수" : "매도"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {fmtTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "font-numeric text-sm font-bold",
                          isBuy ? "text-up" : "text-down",
                        )}
                      >
                        {isBuy ? "+" : "-"}
                        {formatShares(qty)}주
                      </p>
                      <p className="font-numeric text-[11px] text-muted-foreground">
                        {fmtMoney(currency, amount.toDecimalPlaces(currency === "USD" ? 2 : 0))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </DateGroup>
          ))}
        </div>
      )}
    </>
  );
}

// ── CMA 계좌내역 탭 ─────────────────────────────────────────────────────────

type CmaFilter = "all" | "in" | "out" | "interest";

const CMA_LABEL: Record<string, string> = {
  DEPOSIT: "입금",
  BANK_IN: "은행 이체 입금",
  COLLECT: "잔돈 모으기",
  INTEREST: "이자 지급",
  BUY_TRANSFER: "매수 출금",
  SELL_RETURN: "매도 대금 환류",
  FX_IN: "환전 입금",
  FX_OUT: "환전 출금",
  SAVINGS: "적립",
  DORMANT: "휴면 입금",
};

const CMA_PATH: Record<string, string> = {
  BUY_TRANSFER: "CMA→증권계좌",
  SELL_RETURN: "증권계좌→CMA",
  INTEREST: "이자",
  FX_IN: "환전",
  FX_OUT: "환전",
};

function cmaIcon(t: CmaTransaction): LucideIcon {
  if (t.txType === "INTEREST") return Percent;
  if (t.txType === "COLLECT") return Coins;
  return t.amount >= 0 ? ArrowDownLeft : ArrowUpRight;
}

function CmaHistoryTab() {
  const [filter, setFilter] = useState<CmaFilter>("all");
  const txQ = useCmaTransactions();
  const homeQ = useCmaHome();
  const txs = txQ.data ?? [];
  const balance = homeQ.data?.cmaBalance.KRW ?? 0;

  const matches = (t: CmaTransaction) => {
    if (filter === "all") return true;
    if (filter === "interest") return t.txType === "INTEREST";
    if (filter === "in") return t.amount > 0 && t.txType !== "INTEREST";
    return t.amount < 0; // out
  };

  // 정정(REVERT)은 충당 보정용 내부 거래라 내역에서 숨긴다.
  const filtered = txs.filter((t) => t.txType !== "REVERT" && matches(t));
  const groups = groupByDate(filtered, (t) => t.createdAt);

  return (
    <>
      <div className="flex gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          전체
        </Chip>
        <Chip active={filter === "in"} onClick={() => setFilter("in")}>
          입금
        </Chip>
        <Chip active={filter === "out"} onClick={() => setFilter("out")}>
          출금
        </Chip>
        <Chip active={filter === "interest"} onClick={() => setFilter("interest")}>
          이자
        </Chip>
      </div>

      <div className="mt-3">
        <SummaryCard label="CMA 현재 잔액" value={formatKRW(balance)} />
      </div>

      {txQ.isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState title="계좌 내역이 없어요" className="py-16" />
      ) : (
        <div>
          {groups.map((g) => (
            <DateGroup key={g.header} header={g.header}>
              {g.rows.map((t) => {
                const Icon = cmaIcon(t);
                const positive = t.amount >= 0;
                const path = CMA_PATH[t.txType];
                const sub = [path, fmtTime(t.createdAt)].filter(Boolean).join(" · ");
                return (
                  <div key={t.id} className="flex items-center gap-3 py-3.5">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted",
                        positive ? "text-up" : "text-down",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {CMA_LABEL[t.txType] ?? t.txType}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{sub}</p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 font-numeric text-sm font-bold",
                        positive ? "text-up" : "text-down",
                      )}
                    >
                      {positive ? "+" : "-"}
                      {fmtMoney(t.currency, Math.abs(t.amount))}
                    </p>
                  </div>
                );
              })}
            </DateGroup>
          ))}
        </div>
      )}
    </>
  );
}

// ── 페이지 ──────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("trade");

  return (
    <>
      <AppHeader variant="sub" title="거래내역" />

      {/* 상단 탭 */}
      <div className="-mx-5 mb-4 flex border-b border-border">
        {(
          [
            ["trade", "매매 내역"],
            ["cma", "CMA 계좌내역"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "relative flex-1 py-3 text-sm font-bold transition-colors",
              tab === value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
            {tab === value && (
              <span className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-1/2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "trade" ? <TradeHistoryTab /> : <CmaHistoryTab />}
    </>
  );
}
