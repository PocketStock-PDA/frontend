"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Coins,
  Percent,
  type LucideIcon,
} from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { EmptyState } from "@/components/common/EmptyState";
import {
  ListSkeleton,
  fmtMoney,
  fmtTime,
  shortDateHeader,
  isInMonth,
} from "@/components/features/history/shared";
import { useCmaTransactions } from "@/hooks/queries/useCmaTransactions";
import { useCmaBalance } from "@/hooks/queries/useCmaBalance";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { CmaBalance, CmaTransaction, Currency } from "@/types/domain/cma";

// ── 거래 분류·라벨 ───────────────────────────────────────────────────────────

type CmaFilter = "all" | "in" | "out" | "interest" | "fx";

const TX_TITLE: Record<string, string> = {
  INTEREST: "이자 지급",
  COLLECT: "잔돈 모으기",
  DEPOSIT: "입금",
  BANK_IN: "은행 자동입금",
  DORMANT: "휴면 잔돈 입금",
  SAVINGS: "적립",
  SELL_RETURN: "매도 정산",
  BUY_TRANSFER: "매수 충전",
  FX_IN: "달러 충전",
  FX_OUT: "환전 출금",
};

const COLLECT_SOURCE: Record<string, string> = {
  ACCOUNT: "계좌 끝전",
  CARD: "카드 라운드업",
  POINT: "포인트 전환",
};

function txDesc(t: CmaTransaction): string {
  const krw = t.currency === "KRW";
  switch (t.txType) {
    case "INTEREST": return krw ? "원화 이자" : "달러 이자";
    case "COLLECT":  return COLLECT_SOURCE[t.sourceType] ?? "잔돈";
    case "DEPOSIT":  return "직접 입금";
    case "BANK_IN":  return "연동 계좌에서";
    case "DORMANT":  return "잠자던 계좌에서";
    case "SELL_RETURN": return krw ? "국내 예수금에서" : "해외 예수금에서";
    case "BUY_TRANSFER": return krw ? "국내 예수금으로" : "해외 예수금으로";
    case "FX_IN":   return "환전으로";
    case "FX_OUT":  return "원화 → 달러";
    default:        return "";
  }
}

function txIcon(t: CmaTransaction): LucideIcon {
  switch (t.txType) {
    case "INTEREST":          return Percent;
    case "COLLECT":           return Coins;
    case "FX_IN": case "FX_OUT": return ArrowLeftRight;
    case "BUY_TRANSFER":      return ArrowUpRight;
    default: return t.amount >= 0 ? ArrowDownLeft : ArrowUpRight;
  }
}

function matchesFilter(t: CmaTransaction, filter: CmaFilter): boolean {
  const isFx = t.txType === "FX_IN" || t.txType === "FX_OUT";
  switch (filter) {
    case "all":      return true;
    case "interest": return t.txType === "INTEREST";
    case "fx":       return isFx;
    case "in":       return t.amount > 0 && t.txType !== "INTEREST" && !isFx;
    case "out":      return t.amount < 0 && !isFx;
  }
}

function matchesScope(t: CmaTransaction, scope: BalScope): boolean {
  if (scope === "all") return true;
  return scope === "krw" ? t.currency === "KRW" : t.currency === "USD";
}

const FILTERS: { value: CmaFilter; label: string }[] = [
  { value: "all",      label: "전체" },
  { value: "in",       label: "입금" },
  { value: "out",      label: "출금" },
  { value: "interest", label: "이자" },
  { value: "fx",       label: "환전" },
];

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

// ── 월 목록 ─────────────────────────────────────────────────────────────────

function buildMonths() {
  const now = new Date();
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}
const MONTHS = buildMonths();

// ── 잔액 헤더 ────────────────────────────────────────────────────────────────

type BalScope = "all" | "krw" | "usd";

const BAL_SCOPE_OPTIONS: { label: string; value: BalScope }[] = [
  { label: "전체", value: "all" },
  { label: "원화", value: "krw" },
  { label: "달러", value: "usd" },
];

function ratePct(rate: number): string {
  const pct = toDecimal(rate).times(100).toDecimalPlaces(2).toNumber();
  return `연 ${pct}%`;
}

function BalanceHeader({
  balance, todayInterest, cmaAccountNo, loading, scope, onScopeChange,
}: {
  balance: CmaBalance | undefined;
  todayInterest: number | undefined;
  cmaAccountNo: string | undefined;
  loading: boolean;
  scope: BalScope;
  onScopeChange: (s: BalScope) => void;
}) {
  const [usdKrw, setUsdKrw] = useState(false);
  const fx = useExchangeRate().data?.baseRate ?? null;

  const krw = balance?.accounts.find((a) => a.currency === "KRW");
  const usd = balance?.accounts.find((a) => a.currency === "USD");
  const hasUsd = !!usd;
  const eff: BalScope = hasUsd ? scope : "krw";

  let label = "CMA 총 잔액";
  let value: number | string = balance?.totalKrwEquivalent ?? 0;
  let currency: Currency = "KRW";
  let rate: number | null = null;
  let showInterest = true;
  const showKrw = eff === "usd" && usdKrw && fx !== null;

  if (eff === "krw") {
    label = hasUsd ? "원화 잔액" : "CMA 잔액";
    value = krw?.balance ?? 0;
    rate = krw?.interestRate ?? null;
  } else if (eff === "usd") {
    label = "달러 잔액";
    const usdBal = usd?.balance ?? 0;
    value = showKrw && fx !== null ? toDecimal(usdBal).times(fx).toString() : usdBal;
    currency = showKrw ? "KRW" : "USD";
    rate = usd?.interestRate ?? null;
    showInterest = false;
  }

  const interestText =
    showInterest && todayInterest !== undefined ? fmtMoney("KRW", todayInterest) : null;

  return (
    <section className="overflow-hidden rounded-2xl bg-brand-surface">
      <div className="p-5">
        {hasUsd && (
          <SegmentedControl
            options={BAL_SCOPE_OPTIONS}
            value={scope}
            onChange={onScopeChange}
            className="mb-4"
          />
        )}
        {loading ? (
          <div className="space-y-2.5 py-1">
            <div className="h-4 w-20 animate-pulse rounded bg-brand/10" />
            <div className="h-8 w-44 animate-pulse rounded bg-brand/10" />
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-baseline gap-1.5">
              <p className="text-sm font-medium text-primary">{label}</p>
              {cmaAccountNo && (
                <p className="text-xs text-muted-foreground">{cmaAccountNo}</p>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <AmountDisplay value={value} currency={currency} size="xl" className="text-foreground" />
              {eff === "usd" && fx !== null && (
                <CurrencyToggle checked={usdKrw} onChange={setUsdKrw} />
              )}
            </div>
            {(rate !== null || interestText !== null) && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {rate !== null && (
                  <span className="font-semibold text-primary">{ratePct(rate)}</span>
                )}
                {rate !== null && interestText !== null && " · "}
                {interestText !== null && (
                  <>오늘 이자{" "}
                    <span className="font-numeric font-semibold text-down">+{interestText}</span>
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function CurrencyToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "원화로 보기 (켜짐)" : "원화로 보기 (꺼짐)"}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span className={cn(
        "flex size-5 items-center justify-center rounded-full bg-white font-numeric text-[11px] font-bold shadow-sm transition-transform duration-200 ease-out",
        checked ? "translate-x-5 text-primary" : "translate-x-0 text-muted-foreground",
      )}>
        {checked ? "₩" : "$"}
      </span>
    </button>
  );
}

// ── 페이지 ──────────────────────────────────────────────────────────────────

const SCOPE_EMPTY: Record<BalScope, string> = {
  all: "거래 내역이 없어요",
  krw: "원화 거래 내역이 없어요",
  usd: "달러 거래 내역이 없어요",
};

export default function CmaHistoryPage() {
  const [scope, setScope]   = useState<BalScope>("all");
  const [filter, setFilter] = useState<CmaFilter>("all");
  const [month, setMonth]   = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const txQ     = useCmaTransactions();
  const balanceQ = useCmaBalance();
  const homeQ   = useCmaHome();
  const oldest  = MONTHS[MONTHS.length - 1] ?? MONTHS[0];
  const now     = new Date();
  const isLatest  = month.year === now.getFullYear() && month.month === now.getMonth() + 1;
  const isOldest  = month.year === oldest?.year && month.month === oldest?.month;

  function goMonth(delta: number) {
    const d = new Date(month.year, month.month - 1 + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const filtered = useMemo(() => {
    const txs = txQ.data ?? [];
    return txs.filter(
      (t) =>
        t.txType !== "REVERT" &&
        isInMonth(t.createdAt, month.year, month.month) &&
        matchesScope(t, scope) &&
        matchesFilter(t, filter),
    );
  }, [txQ.data, month, scope, filter]);

  const groups = groupByDateShort(filtered, (t) => t.createdAt);

  return (
    <>
      <AppHeader variant="sub" title="CMA 거래내역" />

      <BalanceHeader
        balance={balanceQ.data}
        todayInterest={homeQ.data?.todayInterest}
        cmaAccountNo={homeQ.data?.cmaAccountNo}
        loading={balanceQ.isLoading}
        scope={scope}
        onScopeChange={setScope}
      />

      {/* 필터 행: 언더바 탭(좌) + ← 월 →(우) — border-b가 두 요소를 하나의 시각 층으로 묶음 */}
      <div className="mt-4 border-b border-border">
        <div className="flex items-end justify-between">
          <div className="flex">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "relative px-3 pb-3 pt-1 text-[14px] font-medium transition-colors",
                  filter === f.value ? "text-brand font-semibold" : "text-muted-foreground",
                )}
              >
                {f.label}
                {filter === f.value && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </div>

          {/* ← 6월 → — pb-3 pt-1로 탭 텍스트 기준선과 높이 맞춤 */}
          <div className="flex shrink-0 items-center gap-1 pb-3 pl-3 pt-1">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              disabled={isOldest}
              className="p-0.5 disabled:opacity-30"
              aria-label="이전 달"
            >
              <ChevronLeft className="size-4.5 text-muted-foreground" />
            </button>
            <span className="min-w-[36px] text-center text-[14px] font-bold text-foreground">
              {month.year !== now.getFullYear() ? `${month.year}년 ` : ""}{month.month}월
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              disabled={isLatest}
              className="p-0.5 disabled:opacity-30"
              aria-label="다음 달"
            >
              <ChevronRight className="size-4.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* 거래 목록 */}
      {txQ.isLoading ? (
        <ListSkeleton />
      ) : txQ.isError ? (
        <EmptyState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." className="py-16" />
      ) : filtered.length === 0 ? (
        <EmptyState title={SCOPE_EMPTY[scope]} className="py-16" />
      ) : (
        <div className="pb-8 pt-4">
          {groups.map((g, gi) => (
            <div key={g.header} className={cn(gi > 0 && "mt-4 border-t border-border/60 pt-4")}>
              <p className="mb-2 text-[12px] font-medium text-muted-foreground">{g.header}</p>
              <div>
                {g.rows.map((t) => {
                  const Icon = txIcon(t);
                  const positive = t.amount >= 0;
                  const desc = [txDesc(t), fmtTime(t.createdAt)].filter(Boolean).join(" · ");
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-foreground">
                          {TX_TITLE[t.txType] ?? t.txType}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn(
                          "font-numeric text-[15px] font-bold",
                          positive ? "text-down" : "text-foreground",
                        )}>
                          {positive ? "+" : "−"}
                          {fmtMoney(t.currency, toDecimal(t.amount).abs())}
                        </p>
                        <p className="mt-0.5 font-numeric text-xs text-muted-foreground">
                          잔액 {fmtMoney(t.currency, t.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
