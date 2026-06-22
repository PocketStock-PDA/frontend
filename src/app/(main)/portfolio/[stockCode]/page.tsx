"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import Decimal from "decimal.js";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { JigsawPuzzle } from "@/components/features/portfolio/JigsawPuzzle";
import { PuzzleOrderSheet } from "@/components/features/portfolio/PuzzleOrderSheet";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useOrders } from "@/hooks/queries/useOrders";
import { useBuyOrder } from "@/hooks/mutations/useBuyOrder";
import { useSellOrder } from "@/hooks/mutations/useSellOrder";
import { formatKRW } from "@/lib/utils/currency";

const PIECES_PER_SHARE = 100; // 1주 = 100조각

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(4).toString();
}

interface Selection {
  mode: "buy" | "sell";
  indexes: number[];
}

export default function StockPuzzlePage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const holdingsQ = useHoldings();
  const detailQ = useStockDetail(stockCode);
  const ordersQ = useOrders();
  const buyOrder = useBuyOrder();
  const sellOrder = useSellOrder();
  const [sel, setSel] = useState<Selection | null>(null);

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
  const holding = holdingsQ.data?.find((h) => h.stockCode === stockCode);

  // 금액·수량 계산은 decimal.js 필수 (README 가이드라인)
  const qty = new Decimal(holding?.quantity ?? 0);
  const price = new Decimal(detail.price.currentPrice);
  const frac = qty.minus(qty.floor());
  const pieces = frac
    .times(PIECES_PER_SHARE)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber(); // 0~100
  const evalAmount = qty.times(price);
  const remainAmount = new Decimal(1).minus(frac).times(price);

  // 주문 (틀): 조각당 금액 = 현재가 / 100
  const market = detail.currency === "USD" ? "OVERSEAS" : "DOMESTIC";
  const selPieces = sel?.indexes.length ?? 0;
  const orderAmount = price.div(PIECES_PER_SHARE).times(selPieces);
  const ordering = buyOrder.isPending || sellOrder.isPending;

  const handleConfirm = () => {
    if (!sel) return;
    const amount = orderAmount.toNumber();
    const opts = { onSuccess: () => setSel(null) };
    if (sel.mode === "buy") {
      buyOrder.mutate(
        { stockCode, market, orderType: "AMOUNT", amount },
        opts,
      );
    } else {
      sellOrder.mutate(
        { stockCode, market, orderType: "AMOUNT", amount },
        opts,
      );
    }
  };

  const recentOrders = (ordersQ.data ?? [])
    .filter((o) => o.stockCode === stockCode)
    .slice(0, 5);

  return (
    <>
      <AppHeader variant="sub" title={detail.stockName} showMenu={false} />

      <div className="space-y-6 pb-8 pt-1">
        {/* 현재가 + 등락 */}
        <div className="flex items-baseline gap-2">
          <AmountDisplay value={price.toString()} size="lg" />
          <ChangeIndicator value={detail.price.changeRate} percent size="md" />
        </div>

        {/* 퍼즐 현황 (조각 탭 → 매수/매도 선택) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">퍼즐 현황</h2>
            <span className="font-numeric text-sm font-bold text-primary">
              {pieces}/{PIECES_PER_SHARE} 조각
            </span>
          </div>
          <JigsawPuzzle
            total={PIECES_PER_SHARE}
            filled={pieces}
            onSelectionCommit={setSel}
            selectedIndexes={sel?.indexes ?? []}
          />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-primary" />
            빈 조각 탭 → 매수 · 채운 조각 탭 → 매도
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
              = {formatKRW(evalAmount.toString())}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">1주까지 남은 금액</p>
            <AmountDisplay
              value={remainAmount.toString()}
              size="lg"
              className="font-bold"
            />
            {/* TODO: "≈ N일 (정기 적립식 기준)" — 적립식 설정 API 연동 후 */}
          </div>
        </div>

        {/* 최근 내역 */}
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">최근 내역</h2>
          {recentOrders.length === 0 ? (
            <EmptyState title="최근 내역이 없어요" className="py-6" />
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map((o) => (
                <div
                  key={o.orderId}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {o.side === "BUY" ? "매수" : "매도"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(o.createdAt), "yyyy.MM.dd")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-numeric text-sm font-bold text-foreground">
                      {formatShares(new Decimal(o.quantity))}주
                    </p>
                    <p className="font-numeric text-xs text-muted-foreground">
                      {formatKRW(
                        new Decimal(o.price).times(o.quantity).toString(),
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <PuzzleOrderSheet
        open={!!sel}
        onClose={() => setSel(null)}
        mode={sel?.mode ?? "buy"}
        stockName={detail.stockName}
        pieces={selPieces}
        currentFilled={pieces}
        total={PIECES_PER_SHARE}
        amount={orderAmount.toNumber()}
        onConfirm={handleConfirm}
        pending={ordering}
      />
    </>
  );
}
