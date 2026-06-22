"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/common/AppHeader";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { HoldingCard } from "@/components/features/portfolio/HoldingCard";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { formatKRW } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { queryKeys } from "@/lib/utils/queryKeys";

const PIECES_PER_SHARE = 100;

export default function PortfolioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const holdingsQ = useHoldings();
  const holdings = holdingsQ.data ?? [];
  const codes = holdings.map((h) => h.stockCode);
  const details = useStockDetails(codes);

  const detailsLoading = codes.length > 0 && details.some((d) => d.isLoading);
  const detailsError = codes.length > 0 && details.some((d) => d.isError);

  if (holdingsQ.isLoading || detailsLoading) {
    return (
      <div className="space-y-5">
        <SkeletonCard lines={2} className="h-36" />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  // 보유 조회 실패 또는 일부 종목 시세 실패(평가액 0 오인 방지) 시 에러 노출
  if (holdingsQ.isError || detailsError) {
    return (
      <div>
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: queryKeys.trading.all })
              }
            >
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  // 금액·수량 계산은 decimal.js 필수 (README 가이드라인)
  // TODO: 혼합 통화(USD) 보유 시 환율 환산 필요 — 현재는 KRW 기준
  const rows = holdings.map((h, i) => {
    const detail = details[i]?.data;
    const qty = toDecimal(h.quantity);
    const price = toDecimal(detail?.price.currentPrice);
    const evalAmount = qty.times(price);
    const invested = qty.times(toDecimal(h.avgBuyPrice));
    const profit = evalAmount.minus(invested);
    const rate = invested.gt(0)
      ? profit.div(invested).times(100)
      : new Decimal(0);
    const pieces = qty
      .minus(qty.floor())
      .times(PIECES_PER_SHARE)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    return { h, detail, evalAmount, invested, profit, rate, pieces };
  });

  const totalEval = rows.reduce((s, r) => s.plus(r.evalAmount), new Decimal(0));
  const totalInvested = rows.reduce(
    (s, r) => s.plus(r.invested),
    new Decimal(0),
  );
  const totalProfit = totalEval.minus(totalInvested);
  const totalRate = totalInvested.gt(0)
    ? totalProfit.div(totalInvested).times(100)
    : new Decimal(0);
  const sign = totalProfit.gte(0) ? "+" : "-";

  return (
    <>
      <AppHeader
        variant="sub"
        title="포트폴리오"
        right={
          /* TODO: 종목 추가(검색) 화면 연결 */
          <Button variant="outline" size="sm" className="rounded-full">
            <Plus />
            종목 추가
          </Button>
        }
      />
      <div className="space-y-5">
      {/* 히어로: 총 평가/손익/투자 */}
      <div
        style={{
          background: "linear-gradient(135deg, #0046FF 0%, #6B3FF5 100%)",
        }}
        className="rounded-xl p-5 text-white"
      >
        <p className="text-sm text-white/90">총 평가금액</p>
        <AmountDisplay
          value={totalEval.toString()}
          size="xl"
          className="mt-1 text-white"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-numeric text-sm font-semibold">
            {sign}
            {formatKRW(totalProfit.abs().toString())} ({sign}
            {totalRate.abs().toFixed(2)}%)
          </span>
          <span className="text-sm text-white/80">
            총 투자 {formatKRW(totalInvested.toString())}
          </span>
        </div>
        <div className="my-3 h-px bg-white/20" />
        <div className="flex items-center justify-between text-sm text-white/85">
          {/* TODO: "다음 적립일 · 월요일 09:00" — 적립식 설정 API 연동 후 */}
          <span>정기 적립식 진행 중</span>
          <span>{holdings.length}종목 모으는 중</span>
        </div>
      </div>

      {/* 종목별 현황 */}
      <section>
        <SectionHeader
          title="종목별 현황"
          action={
            // TODO: 모으기 관리 화면 연결
            <button type="button" className="text-sm text-muted-foreground">
              모으기 관리
            </button>
          }
        />
        {rows.length === 0 ? (
          <EmptyState title="보유 종목이 없어요" />
        ) : (
          <div className="space-y-3">
            {rows.map(({ h, detail, evalAmount, profit, rate, pieces }) => (
              <HoldingCard
                key={h.stockCode}
                name={detail?.stockName ?? h.stockCode}
                ticker={h.stockCode}
                logoUrl={detail?.logoUrl ?? null}
                pieces={pieces}
                quantity={h.quantity}
                evalAmount={evalAmount.toNumber()}
                profit={profit.toNumber()}
                rate={rate.toNumber()}
                onClick={() => router.push(`/portfolio/${h.stockCode}`)}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </>
  );
}
