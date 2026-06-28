"use client";

import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { Info, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { useMaturityReservations } from "@/hooks/queries/useMaturityReservations";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { DividendStockItem } from "@/types/domain/asset";

// 매수 예약 최소 금액(reserve 단계와 동일)
const MIN_AMOUNT = 1_000;

export default function MaturityPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useMaturityRecommendation();
  const { data: reservations = [] } = useMaturityReservations();
  const [depositRatio, setDepositRatio] = useState(75);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const account = data?.triggerAccount ?? null;
  const stocks = data?.recommendations ?? [];

  const { depositAmount, dividendAmount } = useMemo(() => {
    if (!account) return { depositAmount: 0, dividendAmount: 0 };
    const principal = new Decimal(account.principalAmount);
    const dAmt = principal
      .times(new Decimal(depositRatio).dividedBy(100))
      .toDecimalPlaces(0);
    const vAmt = principal.minus(dAmt).toDecimalPlaces(0);
    return { depositAmount: dAmt.toNumber(), dividendAmount: vAmt.toNumber() };
  }, [account, depositRatio]);

  // 선택된 종목별 매수금액 (균등 분배)
  const perStockAmount = useMemo(() => {
    const n = selectedCodes.size;
    if (n === 0 || dividendAmount === 0) return 0;
    return Math.floor(dividendAmount / n);
  }, [selectedCodes.size, dividendAmount]);

  // 이미 RESERVED 상태인 종목코드 (재예약 방지)
  const reservedCodes = useMemo(
    () =>
      new Set(
        reservations
          .filter((r) => r.status === "RESERVED")
          .map((r) => r.stockCode),
      ),
    [reservations],
  );

  const toggleStock = (code: string) => {
    if (reservedCodes.has(code)) return; // 이미 예약된 종목은 선택 불가
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // 종목당 매수금액이 최소 주문금액 미만이면 0원 예약이 만들어지므로 진행을 막는다.
  const belowMin = perStockAmount < MIN_AMOUNT;

  const handleGoToReserve = () => {
    if (!account?.accountId || selectedCodes.size === 0 || belowMin) return;
    const items = [...selectedCodes].map((code) => `${code}:${perStockAmount}`).join(",");
    // 계좌는 reserve에서 triggerAccount로 다시 잡으므로 URL엔 종목·금액만 싣는다.
    router.push(`/recommendations/maturity/reserve?items=${items}`);
  };

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <div className="space-y-4">
          <SkeletonCard lines={1} className="h-14" />
          <SkeletonCard lines={3} className="h-28" />
          <SkeletonCard lines={4} className="h-44" />
          <SkeletonCard lines={4} className="h-44" />
        </div>
      </>
    );
  }

  if (isError || !data || !account) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <EmptyState
          title="만기 예정 계좌가 없어요"
          description="30일 이내 만기 도래 예금·적금이 있을 때 표시됩니다."
        />
      </>
    );
  }

  const [, mm, dd] = account.maturityDate.split("-");
  const formattedMaturity = `${parseInt(mm ?? "0")}/${parseInt(dd ?? "0")}`;

  const hasBottomSection = selectedCodes.size > 0;

  return (
    <>
      <AppHeader variant="sub" title="만기 자금 굴리기" />

      <div className={cn("space-y-4", hasBottomSection && "pb-6")}>
        {/* ── 트리거 계좌 ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">
              {account.accountName}{" "}
              <span className="font-numeric tabular-nums">
                {formatKRW(account.principalAmount)}
              </span>
            </p>
            <p className="mt-0.5 font-numeric text-xs tabular-nums text-muted-foreground">
              {formattedMaturity} 만기 · D-{account.daysUntilMaturity} · 연{" "}
              {account.interestRate}%
            </p>
          </div>
          <span className="text-xs font-bold text-amber-700">만기 도래</span>
        </div>

        {/* ── 슬라이더 ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3.5 text-sm font-bold text-foreground">
            얼마나 나눠 담을까요?
          </p>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={depositRatio}
            onChange={(e) => setDepositRatio(Number(e.target.value))}
            className="w-full cursor-pointer appearance-none"
            style={{
              height: "6px",
              borderRadius: "9999px",
              outline: "none",
              background: `linear-gradient(to right, #c9d2dd 0%, #c9d2dd ${depositRatio}%, #2563eb ${depositRatio}%, #2563eb 100%)`,
            }}
          />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground">
              예금 재예치{" "}
              <span className="font-numeric tabular-nums">
                {formatKRW(depositAmount)}
              </span>
            </span>
            <span className="font-bold text-primary">
              배당주{" "}
              <span className="font-numeric tabular-nums">
                {formatKRW(dividendAmount)}
              </span>
            </span>
          </div>
          <div className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            {depositRatio === 100 ? (
              "전액 예금 재예치로 안전하게 굴려요."
            ) : depositRatio === 0 ? (
              "전액 배당주에 투자해 배당 수익을 노려요."
            ) : (
              <>
                원금{" "}
                <span className="font-semibold text-foreground">
                  {depositRatio}%
                </span>
                는 안전하게 예금에, 나머지{" "}
                <span className="font-numeric font-semibold tabular-nums text-foreground">
                  {formatKRW(dividendAmount)}
                </span>
                으로 배당을 받기 시작해요.
              </>
            )}
          </div>
          <div className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <Info className="mt-px size-3 shrink-0" />
            <span>
              예금은 원금이 보장(예금자보호)되지만, 배당주는 원금·배당이 변동할
              수 있어요.
            </span>
          </div>
        </div>

        {/* ── 배당주 고르기 ─────────────────────────────────────────────── */}
        {dividendAmount > 0 && (
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">배당주 고르기</h2>
              <span className="font-numeric text-xs tabular-nums text-muted-foreground">
                {account.interestRate}% 이상
              </span>
            </div>
            {stocks.length === 0 ? (
              <EmptyState
                title="추천 배당주가 없어요"
                description="만기 계좌의 이율보다 높은 배당주가 없어요."
              />
            ) : (
              <div className="space-y-2.5">
                {stocks.map((stock) => (
                  <DividendStockCard
                    key={stock.stockCode}
                    stock={stock}
                    dividendAmount={dividendAmount}
                    depositRate={account.interestRate}
                    selected={selectedCodes.has(stock.stockCode)}
                    alreadyReserved={reservedCodes.has(stock.stockCode)}
                    onSelect={() => toggleStock(stock.stockCode)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── 예약된 매수 + 선택 종목 + 예약 버튼 ─────────────────────── */}
        {hasBottomSection && (
          <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-bold text-foreground">예약된 매수</h2>

            {/* 선택 중 (미예약) */}
            {selectedCodes.size > 0 && (
              <div className="rounded-xl border border-dashed border-primary/40 bg-brand-surface px-3 py-2">
                <p className="mb-2 text-xs font-semibold text-primary">
                  선택됨 · 종목당{" "}
                  <span className="font-numeric tabular-nums">
                    {formatKRW(perStockAmount)}
                  </span>{" "}
                  씩
                </p>
                <div className="divide-y divide-border">
                  {[...selectedCodes].map((code) => {
                    const stock = stocks.find((s) => s.stockCode === code);
                    if (!stock) return null;
                    return (
                      <div key={code} className="flex items-center gap-3 py-2.5">
                        <StockLogo name={stock.stockName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {stock.stockName}
                          </p>
                          <p className="font-numeric text-xs tabular-nums text-muted-foreground">
                            {formattedMaturity} 만기일 매수
                          </p>
                        </div>
                        <span className="font-numeric text-sm font-semibold tabular-nums text-foreground">
                          {formatKRW(perStockAmount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleStock(code)}
                          className="rounded-md p-0.5 text-muted-foreground hover:bg-muted/60"
                          aria-label="선택 해제"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 예약하기 버튼 */}
            {selectedCodes.size > 0 && (
              <>
                {belowMin && (
                  <p className="text-center text-xs font-medium text-destructive">
                    종목당 최소 {formatKRW(MIN_AMOUNT)}부터 예약할 수 있어요. 종목 수를
                    줄이거나 배당주 비중을 높여주세요.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleGoToReserve}
                  disabled={belowMin}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
                >
                  {selectedCodes.size}종목 예약 확인하기
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

// "YYYY-MM-DD" → "M/D" (배당 지급일 표시용)
function formatMonthDay(dateStr: string): string {
  const [, mm, dd] = dateStr.split("-");
  return `${parseInt(mm ?? "0")}/${parseInt(dd ?? "0")}`;
}

function StockLogo({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full border border-[#e2ecfb] bg-brand-surface font-numeric font-bold text-primary",
        size === "sm"
          ? "flex size-8 items-center justify-center text-sm"
          : "flex size-10 items-center justify-center text-[15px]",
      )}
    >
      {name.slice(0, 1)}
    </div>
  );
}

interface DividendStockCardProps {
  stock: DividendStockItem;
  dividendAmount: number;
  depositRate: number;
  selected: boolean;
  alreadyReserved: boolean;
  onSelect: () => void;
}

function DividendStockCard({
  stock,
  dividendAmount,
  depositRate,
  selected,
  alreadyReserved,
  onSelect,
}: DividendStockCardProps) {
  const depositInterest = new Decimal(dividendAmount)
    .times(new Decimal(depositRate).dividedBy(100))
    .toDecimalPlaces(0)
    .toNumber();

  const annualIncome = new Decimal(dividendAmount)
    .times(new Decimal(stock.dividendYield).dividedBy(100))
    .toDecimalPlaces(0)
    .toNumber();

  const yieldStr = new Decimal(stock.dividendYield).toFixed(2);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={alreadyReserved}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-colors duration-150",
        alreadyReserved
          ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
          : selected
            ? "border-primary bg-[#f7faff]"
            : "border-border bg-card hover:bg-muted/30 active:bg-muted/50",
      )}
    >
      <div className="flex items-start gap-3">
        <StockLogo name={stock.stockName} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-foreground">
            {stock.stockName}
            <span className="ml-1.5 font-numeric text-xs font-normal text-muted-foreground">
              {stock.stockCode}
            </span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {stock.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {alreadyReserved && (
              <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] font-bold text-primary">
                예약됨
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2.5">
          <div className="text-right">
            <p className="font-numeric text-lg font-bold tabular-nums text-foreground">
              {yieldStr}%
            </p>
            <p className="text-[10px] text-muted-foreground">배당수익률</p>
          </div>
          <div
            className={cn(
              "mt-0.5 size-5 shrink-0 rounded-full border-2 transition-colors duration-150",
              selected
                ? "border-primary bg-primary shadow-[inset_0_0_0_3px_white]"
                : "border-border bg-card",
            )}
          />
        </div>
      </div>

      {/* 예금 vs 배당 비교 */}
      <div
        className={cn(
          "mt-3 rounded-xl px-3 py-2.5 text-xs",
          selected ? "border border-[#dbe7fb] bg-white" : "bg-brand-surface",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[#41556f]">예금 이자 (연 {depositRate}%)</span>
          <span className="font-numeric font-semibold tabular-nums text-foreground">
            {formatKRW(depositInterest)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[#41556f]">이 주식 배당 (연 {yieldStr}%)</span>
          <span className="font-numeric font-bold tabular-nums text-primary">
            {formatKRW(annualIncome)}
          </span>
        </div>
      </div>

      {/* 실제 배당 일정 — KIS 예탁원 배당일정(주당배당금·지급일) 있을 때만 */}
      {stock.perShareDividend != null && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          1주당{" "}
          <span className="font-numeric font-semibold tabular-nums text-foreground">
            {formatKRW(stock.perShareDividend)}
          </span>
          {stock.payDate && (
            <>
              {" "}
              · <span className="font-numeric tabular-nums">{formatMonthDay(stock.payDate)}</span> 지급
            </>
          )}
        </p>
      )}
    </button>
  );
}

