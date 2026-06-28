"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { Stepper } from "@/components/common/Stepper";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useBuyOrder } from "@/hooks/mutations/useBuyOrder";
import { useSellOrder } from "@/hooks/mutations/useSellOrder";
import { genClientOrderId } from "@/lib/utils/idempotency";
import { toDecimal } from "@/lib/utils/decimal";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { splitOrderToast, wholeOrderToast } from "@/lib/utils/orderResult";
import { cn } from "@/lib/utils";
import type {
  SplitOrderResponse,
  WholeOrderResponse,
} from "@/types/domain/order";

type Side = "BUY" | "SELL";
type Method = "FRACTION" | "WHOLE"; // 소수점 / 온주
// 주문 시트 컨텍스트 — 어느 행을 눌렀나(가격: 지정가 number / 시장가 "MARKET")
type OrderCtx = { side: Side; price: OrderPrice };

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
  const router = useRouter();
  const detailQ = useStockDetail(stockCode);
  const holdingsQ = useHoldings();
  const cmaQ = useCmaHome();
  const wholeOrder = useWholeOrder();
  const buyOrder = useBuyOrder();
  const sellOrder = useSellOrder();

  const [showAll, setShowAll] = useState(false); // 5호가 / 10호가
  // 주문 시트 — 호가/시장가 행의 구매·판매를 누르면 열린다(아래에서 올라옴)
  const [ctx, setCtx] = useState<OrderCtx | null>(null);
  const [method, setMethod] = useState<Method>("WHOLE"); // 시트 안 소수점/온주
  const [qty, setQty] = useState(0);
  // 거래 인증 필요 시 계좌 비밀번호를 받아 동일 주문 재시도
  const [authOpen, setAuthOpen] = useState(false);
  // 주문 멱등키: 동일 주문(side+가격+방식+수량) 재시도 시 동일 키 재사용 (issue #4)
  const orderKey = useRef<{ sig: string; key: string } | null>(null);
  // 따닥 탭 방지: React re-render 전에도 즉시 잠금. pending state보다 선행.
  const submitting = useRef(false);

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
  const changeRate = detail.price?.changeRate ?? 0;
  // 전일종가 역산 — 호가별 등락률(상승=red/하락=blue) 계산용
  const prevClose = changeRate !== -100 ? refPrice / (1 + changeRate / 100) : refPrice;

  const pending = wholeOrder.isPending || buyOrder.isPending || sellOrder.isPending;

  // ── 주문 시트 ───────────────────────────────────────────────────────────
  const action = ctx?.side === "BUY" ? "구매" : "판매";
  const isMarketRow = ctx?.price === "MARKET";
  // 소수점은 항상 시장가 체결. 온주는 행에 따라 지정가/시장가.
  const isMarket = method === "FRACTION" || isMarketRow;
  // 최우선(최대한 빠른) 체결가 — 매수=최저 매도호가 / 매도=최고 매수호가
  const bestAsk = ob?.asks[0]?.price ?? refPrice;
  const bestBid = ob?.bids[0]?.price ?? refPrice;
  const fastest = ctx?.side === "BUY" ? bestAsk : bestBid;
  // 체결 추정가 — 소수점/시장가는 현재가(빠른가), 온주 지정가는 그 호가
  const execPrice =
    method === "FRACTION"
      ? refPrice
      : ctx && ctx.price !== "MARKET"
        ? ctx.price
        : fastest;

  // 소수점 QUANTITY 매수 hold = qty × bestAsk × (1+buffer). 국내 1%, 해외 2%.
  const fracBuyBuffer = isUSD ? 0.02 : 0.01;
  // FRACTION hold 계산용 호가 — bestAsk 기준(백엔드 FractionalOrderService와 동일 소스).
  // execPrice(표시용)는 refPrice를 유지하고, 한도/maxQty 계산만 bestAsk로 분리.
  const fracHoldPrice = new Decimal(bestAsk > 0 ? bestAsk : refPrice);

  const maxQty =
    ctx?.side === "BUY"
      ? execPrice > 0
        ? method === "WHOLE"
          ? new Decimal(buyingPower).div(execPrice).floor().toNumber()
          : new Decimal(buyingPower)
              .div(fracHoldPrice.times(1 + fracBuyBuffer))
              .toDecimalPlaces(4, Decimal.ROUND_DOWN)
              .toNumber()
        : 0
      : method === "WHOLE"
        ? holdingQty.floor().toNumber()
        : holdingQty.toDecimalPlaces(4, Decimal.ROUND_DOWN).toNumber();

  const sheetIsOverLimit = (() => {
    if (!ctx || qty <= 0) return false;
    if (ctx.side === "BUY") {
      // FRACTION: hold = qty × bestAsk × (1+buffer). WHOLE: 버퍼 없음.
      const need =
        method === "FRACTION"
          ? new Decimal(qty).times(fracHoldPrice).times(1 + fracBuyBuffer)
          : new Decimal(qty).times(execPrice);
      return need.gt(buyingPower);
    }
    return new Decimal(qty).gt(holdingQty);
  })();
  const sheetOverLimitMsg =
    ctx?.side === "BUY" ? "매수 가능 금액을 초과했어요" : "보유 수량을 초과했어요";

  const openSheet = (side: Side, p: OrderPrice) => {
    setCtx({ side, price: p });
    setMethod("WHOLE");
    setQty(0);
    orderKey.current = null;
  };
  const changeMethod = (m: Method) => {
    setMethod(m);
    setQty(0);
    orderKey.current = null;
  };
  const onQty = (v: number) => {
    setQty(v);
    orderKey.current = null;
  };

  const keyFor = (sig: string) => {
    if (orderKey.current?.sig === sig) return orderKey.current.key;
    const key = genClientOrderId();
    orderKey.current = { sig, key };
    return key;
  };

  const confirm = () => {
    if (!ctx || pending || submitting.current) return;
    submitting.current = true;
    const { side, price: rowPrice } = ctx;
    if (qty <= 0) {
      toast.error("주문 수량을 입력해 주세요.");
      return;
    }
    // 한도 검증 — 매수=구매가능 / 매도=보유수량
    if (side === "BUY") {
      const need =
        method === "FRACTION"
          ? new Decimal(qty).times(fracHoldPrice).times(1 + fracBuyBuffer)
          : new Decimal(qty).times(execPrice);
      if (need.gt(buyingPower)) {
        toast.error("구매 가능 금액을 초과했어요.");
        return;
      }
    } else if (new Decimal(qty).gt(holdingQty)) {
      toast.error("보유 수량을 초과했어요.");
      return;
    }

    const sig = `${side}:${rowPrice}:${method}:${qty}`;
    const clientOrderId = keyFor(sig);
    const baseOpts = {
      onError: (err: unknown) => {
        submitting.current = false;
        if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
          setAuthOpen(true);
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

    if (method === "FRACTION") {
      // 소수점 = 시장가 체결(가격 무시). 소수 주수 QUANTITY 주문.
      const opts = {
        ...baseOpts,
        onSuccess: (data: SplitOrderResponse) => {
          submitting.current = false;
          orderKey.current = null;
          setCtx(null);
          const t = splitOrderToast(side, data);
          toast.success(
            t.title,
            t.description ? { description: t.description } : undefined,
          );
        },
      };
      if (side === "BUY") {
        buyOrder.mutate(
          { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity: qty },
          opts,
        );
      } else {
        sellOrder.mutate(
          { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity: qty },
          opts,
        );
      }
      return;
    }

    // 온주 — 시장가 행이면 MARKET, 호가 행이면 그 가격 LIMIT
    const opts = {
      ...baseOpts,
      onSuccess: (data: WholeOrderResponse) => {
        submitting.current = false;
        orderKey.current = null;
        setCtx(null);
        const t = wholeOrderToast(data, fmtAmount);
        toast.success(
          t.title,
          t.description ? { description: t.description } : undefined,
        );
      },
    };
    if (rowPrice === "MARKET") {
      wholeOrder.mutate(
        { clientOrderId, stockCode, market, side, orderType: "MARKET", quantity: qty },
        opts,
      );
    } else {
      wholeOrder.mutate(
        { clientOrderId, stockCode, market, side, orderType: "LIMIT", price: rowPrice, quantity: qty },
        opts,
      );
    }
  };

  const chips = method === "WHOLE" ? [1, 5, 10] : [0.1, 0.5, 1];

  return (
    <>
      <AppHeader
        variant="sub"
        title={
          // /trading/detail과 동일 — 종목 로고 + 돋보기, 누르면 종목 검색
          <button
            type="button"
            onClick={() => router.push("/trading/search")}
            aria-label="종목 검색 열기"
            className="-mx-1 flex items-center gap-2 rounded-lg px-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Avatar className="size-7">
              {detail.logoUrl && (
                <AvatarImage src={detail.logoUrl} alt={detail.stockName} />
              )}
              <AvatarFallback className="text-[10px]">
                {(detail.stockCode ?? detail.stockName).trim().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col text-left leading-tight">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {detail.stockName}
                <Search className="size-3" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <AmountDisplay
                  value={price.toString()}
                  currency={isUSD ? "USD" : "KRW"}
                  size="md"
                  className="font-bold"
                />
                <ChangeIndicator value={changeRate} percent size="sm" />
              </span>
            </span>
          </button>
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
              prevClose={prevClose}
              totalAskVolume={ob.totalAskVolume}
              totalBidVolume={ob.totalBidVolume}
              count={showAll ? 10 : 5}
              formatPrice={(n) =>
                isUSD ? formatUSD(n) : n.toLocaleString("ko-KR")
              }
              onSell={(p) => openSheet("SELL", p)}
              onBuy={(p) => openSheet("BUY", p)}
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
      </div>

      {/* 주문 시트 — 아래에서 올라옴. 수량 입력 + 소수점/온주 전환 */}
      <Sheet open={!!ctx} onOpenChange={(o) => !o && setCtx(null)}>
        <SheetContent side="bottom" className="gap-0 rounded-t-2xl px-5 pb-7 pt-3">
          <SheetHeader className="p-0">
            <SheetTitle className="text-lg font-bold">
              {action}하기
            </SheetTitle>
            <SheetDescription className="sr-only">
              {action} 주문 수량을 입력해 주세요.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-3 space-y-3 rounded-2xl bg-muted/50 p-4">
            {/* 가격 컨텍스트 + 소수점/온주 토글(우상단) */}
            <div className="flex items-start justify-between">
              <div className="leading-tight">
                <p className="text-xs text-muted-foreground">
                  {isMarket ? "시장가" : "지정가"}
                </p>
                <p className="font-numeric text-lg font-bold text-foreground">
                  {isMarket ? `${fmtAmount(execPrice)} 예상` : fmtAmount(execPrice)}
                </p>
              </div>
              <div className="flex rounded-lg bg-muted p-1 text-xs font-bold">
                {(["FRACTION", "WHOLE"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => changeMethod(m)}
                    className={cn(
                      "rounded-md px-3 py-1.5 transition-colors",
                      method === m
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {m === "FRACTION" ? "소수점" : "온주"}
                  </button>
                ))}
              </div>
            </div>

            <Stepper
              value={qty}
              onChange={onQty}
              step={method === "WHOLE" ? 1 : 0.1}
              min={0}
              precision={method === "WHOLE" ? 0 : 4}
              suffix="주"
              placeholder={
                method === "WHOLE"
                  ? `몇 주 ${action}할까요?`
                  : `소수점 몇 주 ${action}할까요?`
              }
              editable
            />
            <div className="flex gap-2">
              {chips.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    onQty(
                      new Decimal(qty)
                        .plus(n)
                        .toDecimalPlaces(method === "WHOLE" ? 0 : 4)
                        .toNumber(),
                    )
                  }
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  +{n}주
                </button>
              ))}
              <button
                type="button"
                onClick={() => onQty(maxQty)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                최대
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                {ctx?.side === "BUY" ? "구매 가능" : "판매 가능"}
              </span>
              <span className="font-numeric text-sm font-bold text-foreground">
                {ctx?.side === "BUY"
                  ? `${maxQty.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}주`
                  : `${(method === "WHOLE"
                      ? holdingQty.floor()
                      : holdingQty.toDecimalPlaces(4, Decimal.ROUND_DOWN)
                    ).toString()}주`}
              </span>
            </div>
          </div>

          {sheetIsOverLimit && (
            <p className="mt-3 text-center text-xs font-medium text-destructive">
              {sheetOverLimitMsg}
            </p>
          )}
          <Button
            onClick={confirm}
            disabled={pending || qty <= 0 || sheetIsOverLimit}
            className={cn(
              "mt-4 h-12 w-full text-base font-bold text-white",
              ctx?.side === "BUY" ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90",
              sheetIsOverLimit && "opacity-40",
            )}
          >
            {action}하기
          </Button>
        </SheetContent>
      </Sheet>

      <TxnAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onVerified={() => {
          setAuthOpen(false);
          confirm();
        }}
      />
    </>
  );
}
