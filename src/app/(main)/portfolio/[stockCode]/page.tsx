"use client";

import { useParams } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { JigsawPuzzle } from "@/components/features/portfolio/JigsawPuzzle";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { formatKRW } from "@/lib/utils/currency";

const PIECES_PER_SHARE = 100; // 1주 = 100조각

function formatShares(q: number) {
  return q.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

export default function StockPuzzlePage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const holdingsQ = useHoldings();
  const detailQ = useStockDetail(stockCode);

  if (holdingsQ.isLoading || detailQ.isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <SkeletonCard lines={1} className="h-10 border-0 bg-transparent p-0" />
        <SkeletonCard lines={0} className="aspect-square" />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (detailQ.isError || !detailQ.data) {
    return (
      <div className="pt-6">
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => detailQ.refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  const detail = detailQ.data;
  const price = detail.price.currentPrice;
  const holding = holdingsQ.data?.find((h) => h.stockCode === stockCode);
  const qty = holding?.quantity ?? 0;

  const frac = qty - Math.floor(qty);
  const pieces = Math.round(frac * PIECES_PER_SHARE); // 0~100
  const evalAmount = qty * price; // 내 보유 평가금액
  const remainAmount = (1 - frac) * price; // 1주까지 남은 금액

  return (
    <>
      <AppHeader variant="sub" title={detail.stockName} showMenu={false} />

      <div className="space-y-6 pb-8 pt-1">
        {/* 현재가 + 등락 */}
        <div className="flex items-baseline gap-2">
          <AmountDisplay value={price} size="lg" />
          <ChangeIndicator value={detail.price.changeRate} percent size="md" />
        </div>

        {/* 퍼즐 현황 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">퍼즐 현황</h2>
            <span className="font-numeric text-sm font-bold text-primary">
              {pieces}/{PIECES_PER_SHARE} 조각
            </span>
          </div>
          <JigsawPuzzle total={PIECES_PER_SHARE} filled={pieces} />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-primary" />
            최근 매수 조각
          </p>
        </section>

        {/* 보유 / 남은 금액 */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">내 보유</p>
            <p className="font-numeric text-lg font-bold text-foreground">
              {formatShares(qty)}주
            </p>
            <p className="text-xs text-muted-foreground">
              = {formatKRW(evalAmount)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">1주까지 남은 금액</p>
            <AmountDisplay
              value={remainAmount}
              size="lg"
              className="font-bold"
            />
            {/* TODO: "≈ N일 (정기 적립식 기준)" — 적립식 설정(금액/주기) API 연동 후 */}
          </div>
        </div>

        {/* 최근 매수 내역 */}
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">
            최근 매수 내역
          </h2>
          {/* TODO: 매수/거래 내역 API 연동 필요 (현재 미확인) */}
          <EmptyState title="최근 매수 내역이 없어요" className="py-6" />
        </section>
      </div>
    </>
  );
}
