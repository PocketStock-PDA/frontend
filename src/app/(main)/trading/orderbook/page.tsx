"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Stepper } from "@/components/common/Stepper";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import {
  OrderBook,
  type OrderPrice,
} from "@/components/features/trading/OrderBook";
import { TxnAuthDialog } from "@/components/common/TxnAuthDialog";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useOrderBook } from "@/hooks/queries/useOrderBook";
import { useStockQuoteSocket } from "@/hooks/useStockQuoteSocket";
import { useStockTradeSocket } from "@/hooks/useStockTradeSocket";
import { useWholeOrder } from "@/hooks/mutations/useWholeOrder";
import { genClientOrderId } from "@/lib/utils/idempotency";
import { toDecimal } from "@/lib/utils/decimal";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { wholeOrderToast } from "@/lib/utils/orderResult";
import type { WholeOrderResponse } from "@/types/domain/order";

type QtyMode = "RATIO" | "QTY";
type Side = "BUY" | "SELL";

const RATIO_CHIPS = [10, 25, 50, 100];

export default function OrderbookPage() {
  const searchParams = useSearchParams();
  const stockCode = searchParams.get("stockCode");

  if (!stockCode) {
    return <MissingStockCodeState />;
  }

  return <OrderbookContent stockCode={stockCode} />;
}

function MissingStockCodeState() {
  const router = useRouter();

  return (
    <>
      <AppHeader variant="sub" title="호가 주문" />
      <EmptyState
        title="종목 정보가 없어요"
        description="호가를 확인할 종목을 다시 선택해 주세요."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/trading/search")}
          >
            종목 선택
          </Button>
        }
        className="mt-8"
      />
    </>
  );
}

function OrderbookContent({ stockCode }: { stockCode: string }) {
  const detailQ = useStockDetail(stockCode);
  const holdingsQ = useHoldings();
  const cmaQ = useCmaHome();
  const wholeOrder = useWholeOrder();

  const [qtyMode, setQtyMode] = useState<QtyMode>("RATIO");
  const [quantity, setQuantity] = useState(0);
  const [showAll, setShowAll] = useState(false); // 5호가 / 10호가
  // 거래 인증 필요 시 계좌 비밀번호를 받기 위한 시트 — 인증 후 그 주문을 재시도
  const [authRetry, setAuthRetry] = useState<{ side: Side; p: OrderPrice } | null>(
    null,
  );
  // 주문 멱등키: 동일 주문(side+가격+수량) 재시도 시 동일 키 재사용 (issue #4)
  const orderKey = useRef<{ sig: string; key: string } | null>(null);

  const basePrice = detailQ.data?.price?.currentPrice ?? 0;
  const obQ = useOrderBook(stockCode);
  // 실시간 호가: 스냅샷 위에 STOMP 틱으로 사다리·총잔량 갱신 (issue #2)
  useStockQuoteSocket(stockCode, !!stockCode);
  // 실시간 시세(체결) → 헤더 현재가 갱신 (issue #10)
  useStockTradeSocket(stockCode, {
    overseas: detailQ.data?.currency === "USD",
    enabled: !!detailQ.data,
  });

  if (detailQ.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} className="h-10 border-0 bg-transparent p-0" />
        <SkeletonCard lines={6} className="h-80" />
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
  const isUSD = detail.currency === "USD";
  const market = isUSD ? "OVERSEAS" : "DOMESTIC";
  const fmtAmount = (v: number | string) => (isUSD ? formatUSD(v) : formatKRW(v));

  const price = toDecimal(basePrice);
  const holdingQty = toDecimal(
    holdingsQ.data?.find((h) => h.stockCode === stockCode)?.quantity,
  );
  const buyingPower = cmaQ.data?.cmaBalance?.[isUSD ? "USD" : "KRW"] ?? 0;
  const ob = obQ.data;
  const refPrice = ob?.currentPrice ?? basePrice;

  // 비율 기준 최대 매수 가능 수량(온주, 현재가 기준 내림)
  const maxBuyQty = refPrice > 0
    ? new Decimal(buyingPower).div(refPrice).floor().toNumber()
    : 0;

  const setRatio = (pct: number) =>
    setQuantity(new Decimal(maxBuyQty).times(pct).div(100).floor().toNumber());

  const pending = wholeOrder.isPending;

  const keyFor = (sig: string) => {
    if (orderKey.current?.sig === sig) return orderKey.current.key;
    const key = genClientOrderId();
    orderKey.current = { sig, key };
    return key;
  };

  const submit = (side: Side, p: OrderPrice) => {
    if (pending) return;
    if (quantity <= 0) {
      toast.error("주문 수량을 선택해 주세요.");
      return;
    }
    // side별 한도 검증 (매수=구매가능, 매도=보유수량). ※구매가능은 CMA 잔액 기준
    if (side === "BUY") {
      const px = p === "MARKET" ? refPrice : p;
      const maxBuy =
        px > 0 ? new Decimal(buyingPower).div(px).floor().toNumber() : 0;
      if (quantity > maxBuy) {
        toast.error("구매 가능 수량을 초과했어요.");
        return;
      }
    } else if (new Decimal(quantity).gt(holdingQty)) {
      toast.error("보유 수량을 초과했어요.");
      return;
    }
    const sig = `${side}:${p}:${quantity}`;
    const clientOrderId = keyFor(sig);
    const opts = {
      onSuccess: (data: WholeOrderResponse) => {
        orderKey.current = null;
        const t = wholeOrderToast(data, fmtAmount);
        toast.success(
          t.title,
          t.description ? { description: t.description } : undefined,
        );
      },
      onError: (err: unknown) => {
        // 거래 인증 미완료: 계좌 비밀번호 시트를 띄우고, 인증되면 동일 키로 재시도
        if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
          setAuthRetry({ side, p });
          return;
        }
        if (err instanceof ApiError && err.status === 409) {
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
    if (p === "MARKET") {
      wholeOrder.mutate(
        { clientOrderId, stockCode, market, side, orderType: "MARKET", quantity },
        opts,
      );
    } else {
      wholeOrder.mutate(
        { clientOrderId, stockCode, market, side, orderType: "LIMIT", price: p, quantity },
        opts,
      );
    }
  };

  return (
    <>
      <AppHeader
        variant="sub"
        title={
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground">
              {detail.stockName}
            </span>
            <span className="flex items-baseline gap-1.5">
              <AmountDisplay value={price.toString()} size="md" className="font-bold" />
              <ChangeIndicator value={detail.price?.changeRate ?? 0} percent size="sm" />
            </span>
          </span>
        }
      />

      <div className="space-y-4">
        {/* 상한가 / 하한가 */}
        {ob && (
          <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
            <span className="text-xs text-muted-foreground">
              상한가{" "}
              <span className="font-numeric font-bold text-up">
                {fmtAmount(ob.upperLimit)}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              하한가{" "}
              <span className="font-numeric font-bold text-down">
                {fmtAmount(ob.lowerLimit)}
              </span>
            </span>
          </div>
        )}

        {/* 호가 사다리 */}
        {obQ.isError ? (
          <EmptyState
            title="호가를 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            action={
              <Button variant="outline" size="sm" onClick={() => obQ.refetch()}>
                다시 시도
              </Button>
            }
            className="py-8"
          />
        ) : obQ.isLoading || !ob ? (
          <SkeletonCard lines={6} className="h-72" />
        ) : (
          <>
            <OrderBook
              asks={ob.asks}
              bids={ob.bids}
              currentPrice={ob.currentPrice}
              count={showAll ? 10 : 5}
              formatPrice={(n) =>
                isUSD ? formatUSD(n) : n.toLocaleString("ko-KR")
              }
              onSell={(p) => submit("SELL", p)}
              onBuy={(p) => submit("BUY", p)}
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              {showAll ? (
                <>
                  5호가만 보기 <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  10호가 보기 <ChevronDown className="size-4" />
                </>
              )}
            </button>
          </>
        )}

        {/* 모두 취소 (매도 / 매수) */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => toast.info("주문 취소 기능은 준비 중이에요.")}
            className="h-11 flex-1 border-down font-bold text-down hover:bg-down/5"
          >
            매도 모두 취소
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("주문 취소 기능은 준비 중이에요.")}
            className="h-11 flex-1 border-up font-bold text-up hover:bg-up/5"
          >
            매수 모두 취소
          </Button>
        </div>

        {/* 판매 가능 / 구매 가능 */}
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">판매 가능</p>
            <p className="font-numeric text-sm font-bold text-foreground">
              {holdingQty.toDecimalPlaces(0, Decimal.ROUND_DOWN).toString()}주
            </p>
          </div>
          <span className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">구매 가능</p>
            <p className="font-numeric text-sm font-bold text-primary">
              {fmtAmount(buyingPower)}
            </p>
          </div>
        </div>

        {/* 수량 선택: 비율 / 수량 */}
        <div className="space-y-3">
          <SegmentedControl<QtyMode>
            options={[
              { label: "비율", value: "RATIO" },
              { label: "수량", value: "QTY" },
            ]}
            value={qtyMode}
            onChange={setQtyMode}
          />

          {qtyMode === "RATIO" ? (
            <div className="grid grid-cols-4 gap-2">
              {RATIO_CHIPS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRatio(pct)}
                  className="rounded-lg border border-border bg-background py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {pct}%
                </button>
              ))}
            </div>
          ) : (
            <Stepper
              value={quantity}
              onChange={setQuantity}
              step={1}
              min={0}
              suffix="주"
              editable
            />
          )}

          <p className="text-right text-sm">
            <span className="text-muted-foreground">주문 수량 </span>
            <span className="font-numeric font-bold text-foreground">
              {quantity.toLocaleString("ko-KR")}주
            </span>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          호가 행의 <span className="text-down">판매</span> ·{" "}
          <span className="text-up">구매</span>를 누르면 해당 가격으로 주문돼요
        </p>
      </div>

      <TxnAuthDialog
        open={authRetry !== null}
        onOpenChange={(o) => {
          if (!o) setAuthRetry(null);
        }}
        onVerified={() => {
          const retry = authRetry;
          setAuthRetry(null);
          if (retry) submit(retry.side, retry.p);
        }}
      />
    </>
  );
}
