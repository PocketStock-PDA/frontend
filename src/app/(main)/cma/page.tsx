"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Coins,
  Percent,
  type LucideIcon,
} from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Chip,
  ListSkeleton,
  fmtMoney,
  fmtTime,
  groupByDate,
} from "@/components/features/history/shared";
import { useCmaTransactions } from "@/hooks/queries/useCmaTransactions";
import { useCmaBalance } from "@/hooks/queries/useCmaBalance";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { CmaBalance, CmaTransaction, Currency } from "@/types/domain/cma";

// ── 거래 분류·라벨 ───────────────────────────────────────────────────────────

// 유형 필터 — 방향(입금/출금) 기준. 이자·환전은 종류로 분리.
type CmaFilter = "all" | "in" | "out" | "interest" | "fx";

// txType → 사람말 제목 (정식 어휘는 ledger CmaTransaction 도메인 주석 기준)
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

// 잔돈 모으기 출처(sourceType) → 사람말
const COLLECT_SOURCE: Record<string, string> = {
  ACCOUNT: "계좌 끝전",
  CARD: "카드 라운드업",
  POINT: "포인트 전환",
};

/** 거래 한 건의 보조 설명(어디서 왔는지/어디로 갔는지) */
function txDesc(t: CmaTransaction): string {
  const krw = t.currency === "KRW";
  switch (t.txType) {
    case "INTEREST":
      return krw ? "원화 이자" : "달러 이자";
    case "COLLECT":
      return COLLECT_SOURCE[t.sourceType] ?? "잔돈";
    case "DEPOSIT":
      return "직접 입금";
    case "BANK_IN":
      return "연동 계좌에서";
    case "DORMANT":
      return "잠자던 계좌에서";
    case "SELL_RETURN":
      return krw ? "국내 예수금에서" : "해외 예수금에서";
    case "BUY_TRANSFER":
      return krw ? "국내 예수금으로" : "해외 예수금으로";
    case "FX_IN":
      return "환전으로";
    case "FX_OUT":
      return "원화 → 달러";
    default:
      return "";
  }
}

/** 거래 유형 아이콘 — 종류 인식용(반복되는 같은 유형은 같은 아이콘) */
function txIcon(t: CmaTransaction): LucideIcon {
  switch (t.txType) {
    case "INTEREST":
      return Percent;
    case "COLLECT":
      return Coins;
    case "FX_IN":
    case "FX_OUT":
      return ArrowLeftRight;
    case "BUY_TRANSFER":
      return ArrowUpRight; // 나감
    default:
      return t.amount >= 0 ? ArrowDownLeft : ArrowUpRight; // 입금류=들어옴
  }
}

function matchesFilter(t: CmaTransaction, filter: CmaFilter): boolean {
  const isFx = t.txType === "FX_IN" || t.txType === "FX_OUT";
  switch (filter) {
    case "all":
      return true;
    case "interest":
      return t.txType === "INTEREST";
    case "fx":
      return isFx;
    case "in":
      return t.amount > 0 && t.txType !== "INTEREST" && !isFx;
    case "out":
      return t.amount < 0 && !isFx;
  }
}

/** 통화 범위(전체/원화/달러)로 거래 필터 — 헤더 세그먼트와 연동 */
function matchesScope(t: CmaTransaction, scope: BalScope): boolean {
  if (scope === "all") return true;
  return scope === "krw" ? t.currency === "KRW" : t.currency === "USD";
}

const FILTERS: { value: CmaFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "in", label: "입금" },
  { value: "out", label: "출금" },
  { value: "interest", label: "이자" },
  { value: "fx", label: "환전" },
];

// ── 잔액 헤더 (GET /api/cma/balance) — 포트폴리오 개요 카드와 동일 패턴 ────────

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
  balance,
  todayInterest,
  loading,
  scope,
  onScopeChange,
}: {
  balance: CmaBalance | undefined;
  todayInterest: number | undefined;
  loading: boolean;
  scope: BalScope;
  onScopeChange: (s: BalScope) => void;
}) {
  // 달러 잔액을 원화로 환산해 볼지 (false=달러 $, true=원화 ₩). 매매기준율 사용.
  const [usdKrw, setUsdKrw] = useState(false);
  const fx = useExchangeRate().data?.baseRate ?? null;

  const krw = balance?.accounts.find((a) => a.currency === "KRW");
  const usd = balance?.accounts.find((a) => a.currency === "USD");
  const hasUsd = !!usd;
  // 달러 풀이 없으면 토글 없이 원화 단일 표시.
  const eff: BalScope = hasUsd ? scope : "krw";

  let label = "CMA 총 잔액";
  let value = balance?.totalKrwEquivalent ?? 0;
  let currency: Currency = "KRW";
  let rate: number | null = null;
  // 오늘 이자(todayInterest)는 KRW 기준 — 달러 화면에선 의미가 안 맞아 숨긴다.
  let showInterest = true;
  // 달러 scope + 토글 ON + 환율 보유 시에만 원화 환산.
  const showKrw = eff === "usd" && usdKrw && fx !== null;
  if (eff === "krw") {
    label = hasUsd ? "원화 잔액" : "CMA 잔액";
    value = krw?.balance ?? 0;
    rate = krw?.interestRate ?? null;
  } else if (eff === "usd") {
    label = "달러 잔액";
    // 현재 잔액 × 현재 환율만 환산(과거 거래는 native 유지). 토글 OFF면 달러 그대로.
    const usdBal = usd?.balance ?? 0;
    value = showKrw && fx !== null ? usdBal * fx : usdBal;
    currency = showKrw ? "KRW" : "USD";
    rate = usd?.interestRate ?? null;
    showInterest = false;
  }

  const interestText =
    showInterest && todayInterest !== undefined
      ? fmtMoney("KRW", todayInterest)
      : null;

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
            <p className="text-sm font-medium text-primary">{label}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <AmountDisplay
                value={value}
                currency={currency}
                size="xl"
                className="text-foreground"
              />
              {/* 달러 잔액 → 달러($) ↔ 원화(₩) 표시 토글 (환율 보유 시) */}
              {eff === "usd" && fx !== null && (
                <CurrencyToggle checked={usdKrw} onChange={setUsdKrw} />
              )}
            </div>
            {(rate !== null || interestText !== null) && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {rate !== null && (
                  <span className="font-semibold text-primary">
                    {ratePct(rate)}
                  </span>
                )}
                {rate !== null && interestText !== null && " · "}
                {interestText !== null && (
                  <>
                    오늘 이자{" "}
                    <span className="font-numeric font-semibold text-down">
                      +{interestText}
                    </span>
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

/** 달러($) ↔ 원화(₩) 표시 토글. checked=원화. knob에 현재 통화 글자 노출. (포트폴리오와 동일) */
function CurrencyToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full bg-white font-numeric text-[11px] font-bold shadow-sm transition-transform duration-200 ease-out",
          checked ? "translate-x-5 text-primary" : "translate-x-0 text-muted-foreground",
        )}
      >
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
  const [scope, setScope] = useState<BalScope>("all");
  const [filter, setFilter] = useState<CmaFilter>("all");
  const txQ = useCmaTransactions();
  const balanceQ = useCmaBalance();
  const homeQ = useCmaHome();
  const txs = txQ.data ?? [];

  // 정정(REVERT)은 충당 보정용 내부 거래라 내역에서 숨긴다.
  // 통화 범위(헤더 세그먼트) + 유형(칩) 두 필터를 함께 적용.
  const filtered = txs.filter(
    (t) =>
      t.txType !== "REVERT" &&
      matchesScope(t, scope) &&
      matchesFilter(t, filter),
  );
  const groups = groupByDate(filtered, (t) => t.createdAt);

  return (
    <>
      <AppHeader variant="sub" title="CMA 거래내역" />

      <BalanceHeader
        balance={balanceQ.data}
        todayInterest={homeQ.data?.todayInterest}
        loading={balanceQ.isLoading}
        scope={scope}
        onScopeChange={setScope}
      />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            active={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {txQ.isLoading ? (
        <ListSkeleton />
      ) : txQ.isError ? (
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          className="py-16"
        />
      ) : filtered.length === 0 ? (
        <EmptyState title={SCOPE_EMPTY[scope]} className="py-16" />
      ) : (
        <div>
          {groups.map((g, gi) => (
            <div key={g.header}>
              {/* 날짜 경계 — 같은 날짜 안은 선 없이 여백으로만, 다음 날짜는 상단 경계선으로 구분 */}
              <p
                className={cn(
                  "px-1 pb-1.5 text-[12px] text-muted-foreground",
                  gi === 0 ? "pt-2" : "mt-3 border-t border-border pt-4",
                )}
              >
                {g.header}
              </p>
              {g.rows.map((t) => {
                const Icon = txIcon(t);
                const positive = t.amount >= 0;
                const desc = [txDesc(t), fmtTime(t.createdAt)]
                  .filter(Boolean)
                  .join(" · ");
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
                      {/* 입금(+)=파랑(강조), 출금(−)=검정(중립). 주가 등락색과 다른 축 */}
                      <p
                        className={cn(
                          "font-numeric text-[15px] font-bold",
                          positive ? "text-down" : "text-foreground",
                        )}
                      >
                        {positive ? "+" : "−"}
                        {fmtMoney(t.currency, Math.abs(t.amount))}
                      </p>
                      <p className="mt-0.5 font-numeric text-xs text-muted-foreground">
                        잔액 {fmtMoney(t.currency, t.balanceAfter)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
