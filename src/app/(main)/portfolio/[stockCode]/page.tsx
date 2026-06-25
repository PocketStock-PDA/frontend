"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { JigsawPuzzle } from "@/components/features/portfolio/JigsawPuzzle";
import { PuzzleOrderSheet } from "@/components/features/portfolio/PuzzleOrderSheet";
import { TxnAuthDialog } from "@/components/common/TxnAuthDialog";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useOrders } from "@/hooks/queries/useOrders";
import { useBuyOrder } from "@/hooks/mutations/useBuyOrder";
import { useSellOrder } from "@/hooks/mutations/useSellOrder";
import { useCancelOrder } from "@/hooks/mutations/useCancelOrder";
import { useStockTradeSocket } from "@/hooks/useStockTradeSocket";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { genClientOrderId } from "@/lib/utils/idempotency";

const PIECES_PER_SHARE = 100; // 1주 = 100조각

// 미체결/종결 상태 라벨 (FILLED는 칩 미표시). 취소 가능 = QUEUED(소수점)·PENDING(온주).
const ORDER_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "접수됨",
  QUEUED: "체결 대기",
  SENT: "처리 중",
  PENDING: "미체결",
  CANCELLED: "취소됨",
  REJECTED: "실패",
};

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(4).toString();
}

interface Selection {
  mode: "buy" | "sell";
  indexes: number[];
  /** 이 주문 시도의 멱등키 — 재확인/재시도 시 동일 값 재사용 (issue #4) */
  clientOrderId: string;
}

export default function StockPuzzlePage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const holdingsQ = useHoldings();
  const detailQ = useStockDetail(stockCode);
  const ordersQ = useOrders();
  const buyOrder = useBuyOrder();
  const sellOrder = useSellOrder();
  const cancelOrder = useCancelOrder();
  // 실시간 시세(체결) → 현재가 갱신 (issue #10)
  useStockTradeSocket(stockCode, {
    overseas: detailQ.data?.currency === "USD",
    enabled: !!detailQ.data,
  });
  const [sel, setSel] = useState<Selection | null>(null);
  // 거래 인증 필요 시 계좌 비밀번호를 받기 위한 시트 — 인증 후 동일 키로 재시도
  const [authOpen, setAuthOpen] = useState(false);

  if (holdingsQ.isLoading || detailQ.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} className="h-10 border-0 bg-transparent p-0" />
        <SkeletonCard lines={0} className="aspect-square" />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (detailQ.isError || !detailQ.data) {
    return (
      <div>
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

  // 금액·수량 계산은 decimal.js 필수 (README 가이드라인). API 값은 toDecimal로 안전 변환(null→0)
  const qty = toDecimal(holding?.quantity);
  const price = toDecimal(detail.price.currentPrice);
  const frac = qty.minus(qty.floor());
  const pieces = frac
    .times(PIECES_PER_SHARE)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber(); // 0~100
  const evalAmount = qty.times(price);
  const remainAmount = new Decimal(1).minus(frac).times(price);

  // 주문 (틀): 조각당 금액 = 현재가 / 100
  const isUSD = detail.currency === "USD";
  const market = isUSD ? "OVERSEAS" : "DOMESTIC";
  const fmtAmount = (v: number | string) => (isUSD ? formatUSD(v) : formatKRW(v));
  const selPieces = sel?.indexes.length ?? 0;
  const orderAmount = price.div(PIECES_PER_SHARE).times(selPieces);
  const ordering = buyOrder.isPending || sellOrder.isPending;

  // 백엔드 최소 주문금액(국내 1,000원 / 해외 $0.01)을 충족하는 최소 조각 수.
  const perPiece = price.div(PIECES_PER_SHARE);
  const minOrder = isUSD ? 0.01 : 1000;
  const minPieces = perPiece.gt(0)
    ? new Decimal(minOrder).div(perPiece).ceil().toNumber()
    : 1;

  // 선택 확정 = 새 주문 시도 → 멱등키 1개 발급(해제는 null). 재드래그하면 새 키.
  // 최소 주문금액 미만이면, 같은 모드(매수=빈칸 / 매도=채운칸)에서 조각을 1,000원 이상이 될 때까지 자동 추가.
  const handleCommit = (
    s: { mode: "buy" | "sell"; indexes: number[] } | null,
  ) => {
    if (!s) {
      setSel(null);
      return;
    }
    let indexes = s.indexes;
    if (indexes.length < minPieces) {
      // 후보 조각: 매수=빈칸(pieces~99) / 매도=채운칸(0~pieces-1)
      const candidates =
        s.mode === "buy"
          ? Array.from({ length: PIECES_PER_SHARE - pieces }, (_, i) => pieces + i)
          : Array.from({ length: pieces }, (_, i) => i);
      const chosen = new Set(indexes);
      for (const idx of candidates) {
        if (chosen.size >= minPieces) break;
        chosen.add(idx);
      }
      indexes = Array.from(chosen).sort((a, b) => a - b);
      if (indexes.length > s.indexes.length) {
        toast.warning(
          `최소 주문금액은 ${fmtAmount(minOrder)} 이상이에요. ${indexes.length}조각으로 맞췄어요`,
        );
      }
    }
    setSel({ mode: s.mode, indexes, clientOrderId: genClientOrderId() });
  };

  const handleConfirm = () => {
    if (!sel || ordering) return;
    const isBuy = sel.mode === "buy";
    // sel.clientOrderId 재사용 → 따닥 탭/재시도해도 동일 키 = 멱등 (성공 시에만 폐기)
    const clientOrderId = sel.clientOrderId;
    const opts = {
      onSuccess: () => {
        toast.success(`${isBuy ? "매수" : "매도"} 주문이 접수됐어요`);
        setSel(null); // 키 폐기 → 다음 주문은 새 멱등키
      },
      // 실패 시 sel 유지 → 같은 멱등키로 재시도 가능 (시트도 열린 채)
      onError: (err: unknown) => {
        // 거래 인증 미완료: 계좌 비밀번호 시트를 띄우고, 인증되면 동일 키로 재시도
        if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
          setAuthOpen(true);
          return;
        }
        if (err instanceof ApiError && err.status === 409) {
          // 멱등 충돌: 거의 동시 동일 키 → 같은 키로 다시 누르면 기존 결과 반환
          toast.error("이미 처리 중인 주문이에요. 잠시 후 다시 확인해 주세요.");
          return;
        }
        toast.error(
          err instanceof ApiError
            ? err.message
            : "주문에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
    };
    // 조각=수량(1조각=1/PIECES_PER_SHARE주). 금액(AMOUNT)으로 보내면 국내 1,000원 단위 제약에
    // 걸리므로 수량(QUANTITY)으로 보낸다 — 단위 제약 없이 최소 금액만 검증됨.
    const quantity = new Decimal(selPieces).div(PIECES_PER_SHARE).toNumber();
    if (sel.mode === "buy") {
      buyOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity },
        opts,
      );
    } else {
      sellOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity },
        opts,
      );
    }
  };

  const recentOrders = (ordersQ.data ?? [])
    .filter((o) => o.stockCode === stockCode && o.status !== "REJECTED")
    .slice(0, 5);

  // 미체결 주문 취소 (소수점 QUEUED / 온주 PENDING). 성공 시 캐시 무효화 → 목록 갱신.
  const handleCancel = (orderId: number) => {
    if (cancelOrder.isPending) return;
    cancelOrder.mutate(orderId, {
      onSuccess: () => toast.success("주문을 취소했어요"),
      onError: (err: unknown) =>
        toast.error(
          err instanceof ApiError
            ? err.message
            : "주문 취소에 실패했어요. 잠시 후 다시 시도해 주세요.",
        ),
    });
  };

  return (
    <>
      <AppHeader variant="sub" title={detail.stockName} />

      <div className="space-y-6">
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
            onSelectionCommit={handleCommit}
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
              = {fmtAmount(evalAmount.toString())}
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
              {recentOrders.map((o) => {
                const orderQty = toDecimal(o.quantity);
                const orderPrice = toDecimal(o.price);
                // 소수점 주문은 체결 전 price가 비어 0 → 현재가로 추정(≈). 온주는 체결단가 그대로.
                const estimated = !orderPrice.gt(0);
                const amt = (estimated ? price : orderPrice).times(orderQty);
                const cancellable =
                  o.status === "QUEUED" || o.status === "PENDING";
                const canceling =
                  cancelOrder.isPending && cancelOrder.variables === o.orderId;
                return (
                  <div
                    key={o.orderId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {o.side === "BUY" ? "매수" : "매도"}
                        {o.status !== "FILLED" && ORDER_STATUS_LABEL[o.status] && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {ORDER_STATUS_LABEL[o.status]}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(o.createdAt), "yyyy.MM.dd")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-numeric text-sm font-bold text-foreground">
                          {formatShares(orderQty)}주
                        </p>
                        <p className="font-numeric text-xs text-muted-foreground">
                          {amt.gt(0)
                            ? `${estimated ? "≈ " : ""}${fmtAmount(amt.toString())}`
                            : "—"}
                        </p>
                      </div>
                      {cancellable && (
                        <button
                          type="button"
                          onClick={() => handleCancel(o.orderId)}
                          disabled={cancelOrder.isPending}
                          className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          {canceling ? "취소 중..." : "취소"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
        formatAmount={fmtAmount}
        onConfirm={handleConfirm}
        pending={ordering}
      />

      <TxnAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onVerified={handleConfirm}
      />
    </>
  );
}
