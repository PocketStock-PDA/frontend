"use client";

import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { Bell } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { formatKRW } from "@/lib/utils/currency";
import type { DividendStockItem } from "@/types/domain/asset";

export default function MaturityPage() {
  const { data, isLoading, isError } = useMaturityRecommendation();
  const [depositRatio, setDepositRatio] = useState(75);

  const account = data?.triggerAccount ?? null;
  const stocks = data?.recommendations ?? [];

  const { depositAmount, dividendAmount } = useMemo(() => {
    if (!account) return { depositAmount: 0, dividendAmount: 0 };
    const principal = new Decimal(account.principalAmount);
    const dAmt = principal.times(new Decimal(depositRatio).dividedBy(100)).toDecimalPlaces(0);
    const vAmt = principal.minus(dAmt).toDecimalPlaces(0);
    return { depositAmount: dAmt.toNumber(), dividendAmount: vAmt.toNumber() };
  }, [account, depositRatio]);

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <div className="space-y-4">
          <SkeletonCard lines={2} className="h-20" />
          <SkeletonCard lines={3} className="h-40" />
          <SkeletonCard lines={4} className="h-40" />
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

  const maturityParts = account.maturityDate.split("-");
  const formattedMaturity = `${maturityParts[1]}/${maturityParts[2]}`;

  return (
    <>
      <AppHeader variant="sub" title="만기 자금 굴리기" />
      <div className="space-y-5">
        {/* 트리거 계좌 */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-amber-500" />
              <span className="text-sm font-bold text-foreground">
                {account.accountName} {formatKRW(account.principalAmount)}
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-600">만기 도래</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formattedMaturity} 만기 · D-{account.daysUntilMaturity}
          </p>
        </div>

        {/* 슬라이더 */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">
            얼마나 나눠 담을까요?
          </p>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={depositRatio}
            onChange={(e) => setDepositRatio(Number(e.target.value))}
            className="w-full appearance-none"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${depositRatio}%, #22c55e ${depositRatio}%)`,
              height: "6px",
              borderRadius: "9999px",
              outline: "none",
              cursor: "pointer",
            }}
          />

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-600">
              예금 재예치 {formatKRW(depositAmount)}
            </span>
            <span className="font-semibold text-green-600">
              배당주 {formatKRW(dividendAmount)}
            </span>
          </div>

          {depositRatio > 0 && dividendAmount > 0 && (
            <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              원금{" "}
              <span className="font-semibold text-foreground">{depositRatio}%</span>는 안전하게
              예금에 두고, 나머지{" "}
              <span className="font-semibold text-foreground">{formatKRW(dividendAmount)}</span>
              으로 배당을 받기 시작해요.
            </p>
          )}
          {depositRatio === 100 && (
            <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              전액 예금 재예치로 안정적으로 굴려요.
            </p>
          )}
          {depositRatio === 0 && (
            <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              전액 배당주에 투자해 배당 수익을 노려요.
            </p>
          )}

          <p className="mt-3 text-[10px] text-muted-foreground">
            ℹ️ 예금은 원금이 보장(예금자보호)되지만, 배당주는 원금·배당이 변동할 수 있어요.
          </p>
        </div>

        {/* 배당주 목록 */}
        <section>
          <p className="mb-3 text-sm font-semibold text-foreground">배당주 고르기</p>
          {stocks.length === 0 ? (
            <EmptyState
              title="추천 배당주가 없어요"
              description="만기 계좌의 이율보다 높은 배당주가 없어요."
            />
          ) : (
            <div className="space-y-3">
              {stocks.map((stock) => (
                <DividendStockCard
                  key={stock.stockCode}
                  stock={stock}
                  dividendAmount={dividendAmount}
                  depositRate={account.interestRate}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

interface DividendStockCardProps {
  stock: DividendStockItem;
  dividendAmount: number;
  depositRate: number;
}

function DividendStockCard({ stock, dividendAmount, depositRate }: DividendStockCardProps) {
  const depositInterest = new Decimal(dividendAmount)
    .times(new Decimal(depositRate).dividedBy(100))
    .toDecimalPlaces(0)
    .toNumber();

  const annualIncome = new Decimal(dividendAmount)
    .times(new Decimal(stock.dividendYield).dividedBy(100))
    .toDecimalPlaces(0)
    .toNumber();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-foreground">
            {stock.stockName}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
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
          </div>
        </div>
        <span className="text-lg font-bold text-green-600">
          {new Decimal(stock.dividendYield).toFixed(1)}%
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">{formatKRW(dividendAmount)}</span> 예금이면
          이자 연 <span className="font-semibold text-foreground">{formatKRW(depositInterest)}</span>
        </p>
        <p className="mt-0.5 text-green-700">
          이 주식이면 배당 연 <span className="font-semibold">{formatKRW(annualIncome)}</span>
        </p>
      </div>

      <div className="mt-3">
        <Button className="w-full">만기 후 매수 예약</Button>
      </div>
    </div>
  );
}
