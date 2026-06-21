"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { HoldingCard } from "@/components/features/portfolio/HoldingCard";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { formatKRW } from "@/lib/utils/currency";

const PIECES_PER_SHARE = 100;

export default function PortfolioPage() {
  const router = useRouter();
  const holdingsQ = useHoldings();
  const holdings = holdingsQ.data ?? [];
  const codes = holdings.map((h) => h.stockCode);
  const details = useStockDetails(codes);

  const detailsLoading = codes.length > 0 && details.some((d) => d.isLoading);

  if (holdingsQ.isLoading || detailsLoading) {
    return (
      <div className="space-y-5 pt-4">
        <SkeletonCard lines={2} className="h-36" />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (holdingsQ.isError) {
    return (
      <div className="pt-6">
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => holdingsQ.refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  const rows = holdings.map((h, i) => {
    const detail = details[i]?.data;
    const price = detail?.price.currentPrice ?? 0;
    const evalAmount = h.quantity * price;
    const invested = h.quantity * h.avgBuyPrice;
    const profit = evalAmount - invested;
    const rate = invested > 0 ? (profit / invested) * 100 : 0;
    const frac = h.quantity - Math.floor(h.quantity);
    const pieces = Math.round(frac * PIECES_PER_SHARE);
    return { h, detail, evalAmount, invested, profit, rate, pieces };
  });

  const totalEval = rows.reduce((s, r) => s + r.evalAmount, 0);
  const totalInvested = rows.reduce((s, r) => s + r.invested, 0);
  const totalProfit = totalEval - totalInvested;
  const totalRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const sign = totalProfit >= 0 ? "+" : "-";

  return (
    <div className="space-y-5 pb-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">포트폴리오</h1>
        {/* TODO: 종목 추가(검색) 화면 연결 */}
        <Button variant="outline" size="sm" className="rounded-full">
          <Plus />
          종목 추가
        </Button>
      </div>

      {/* 히어로: 총 평가/손익/투자 */}
      <div className="rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] p-5 text-white">
        <p className="text-sm text-white/90">총 평가금액</p>
        <AmountDisplay value={totalEval} size="xl" className="mt-1 text-white" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-numeric text-sm font-semibold">
            {sign}
            {formatKRW(Math.abs(totalProfit))} ({sign}
            {Math.abs(totalRate).toFixed(2)}%)
          </span>
          <span className="text-sm text-white/80">
            총 투자 {formatKRW(totalInvested)}
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
                evalAmount={evalAmount}
                profit={profit}
                rate={rate}
                onClick={() => router.push(`/portfolio/${h.stockCode}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
