"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Stepper } from "@/components/common/Stepper";
import { QuickAmountChips } from "@/components/common/QuickAmountChips";
import { AmountInput } from "@/components/common/AmountInput";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useBuyOrder } from "@/hooks/mutations/useBuyOrder";
import { useSellOrder } from "@/hooks/mutations/useSellOrder";
import { useWholeOrder } from "@/hooks/mutations/useWholeOrder";
import { genClientOrderId } from "@/lib/utils/idempotency";
import { toDecimal } from "@/lib/utils/decimal";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

type Method = "FRACTION" | "WHOLE"; // 소수점 / 온주
type InputMode = "QTY" | "AMOUNT"; // 수량으로 / 금액으로
type Side = "BUY" | "SELL";

const FEE_RATE = 0.001; // 수수료 0.1%

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(4).toString();
}

export default function TradePage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const router = useRouter();
  const detailQ = useStockDetail(stockCode);
  const holdingsQ = useHoldings();
  const cmaQ = useCmaHome();
  const buyOrder = useBuyOrder();
  const sellOrder = useSellOrder();
  const wholeOrder = useWholeOrder();

  const [method, setMethod] = useState<Method>("FRACTION");
  const [inputMode, setInputMode] = useState<InputMode>("QTY");
  const [qty, setQty] = useState(0);
  const [amount, setAmount] = useState(0);
  const [autoCharge, setAutoCharge] = useState(true);

  // 멱등키: 같은 주문(파라미터·side) 재시도 시 동일 키 재사용, 입력 변경 시 폐기 (issue #4)
  const orderKeys = useRef<Record<Side, string | null>>({ BUY: null, SELL: null });
  const resetKeys = () => {
    orderKeys.current = { BUY: null, SELL: null };
  };

  if (detailQ.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} className="h-10 border-0 bg-transparent p-0" />
        <SkeletonCard lines={3} />
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
  const isUSD = detail.currency === "USD";
  const market = isUSD ? "OVERSEAS" : "DOMESTIC";
  const amountDp = isUSD ? 2 : 0; // 금액 반올림 자리수: KRW 0 / USD 2(센트)
  const fmtAmount = (v: number | string) => (isUSD ? formatUSD(v) : formatKRW(v));

  // 금액 계산은 decimal.js 필수 (README 가이드라인). API 값은 toDecimal로 안전 변환(null→0)
  const price = toDecimal(detail.price.currentPrice);
  const holding = holdingsQ.data?.find((h) => h.stockCode === stockCode);
  const holdingQty = toDecimal(holding?.quantity);
  const buyingPower = cmaQ.data?.cmaBalance?.[isUSD ? "USD" : "KRW"] ?? 0;

  // 최대 매수 수량 (매수가능금액 기준). 온주는 내림. ※ 매도 최대는 판매수량 카드 참고
  const maxBuyQty = price.gt(0)
    ? new Decimal(buyingPower).div(price)
    : new Decimal(0);
  const maxQtyValue =
    method === "WHOLE"
      ? maxBuyQty.floor().toNumber()
      : maxBuyQty.toDecimalPlaces(4, Decimal.ROUND_DOWN).toNumber();

  // 세그먼트 연동: 온주는 수량만 가능 → 금액 선택 시 소수점으로 전환
  const changeMethod = (m: Method) => {
    setMethod(m);
    if (m === "WHOLE") {
      setInputMode("QTY");
      setQty((q) => Math.floor(q)); // 온주는 정수 수량
    }
    resetKeys();
  };
  const changeInputMode = (im: InputMode) => {
    if (im === "AMOUNT" && method === "WHOLE") setMethod("FRACTION");
    setInputMode(im);
    resetKeys();
  };

  const onQtyChange = (v: number) => {
    setQty(v);
    resetKeys();
  };
  const onAmountChange = (v: number) => {
    setAmount(v);
    resetKeys();
  };

  // 주문 금액 (수수료·AMOUNT 주문용)
  const orderAmount =
    inputMode === "AMOUNT" ? new Decimal(amount) : new Decimal(qty).times(price);
  const fee = orderAmount.times(FEE_RATE);

  const pending =
    buyOrder.isPending || sellOrder.isPending || wholeOrder.isPending;
  const valid = inputMode === "AMOUNT" ? amount > 0 : qty > 0;

  const makeOpts = (side: Side) => ({
    onSuccess: () => {
      orderKeys.current[side] = null; // 키 폐기 → 다음 주문은 새 키
      setQty(0);
      setAmount(0);
      toast.success(`${side === "BUY" ? "매수" : "매도"} 주문이 접수됐어요`);
    },
    // 실패 시 키 유지 → 같은 주문 재시도 시 동일 키(멱등)
    onError: (err: unknown) => {
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
  });

  const submit = (side: Side) => {
    if (pending || !valid) return;
    const clientOrderId = orderKeys.current[side] ?? genClientOrderId();
    orderKeys.current[side] = clientOrderId;
    const opts = makeOpts(side);

    if (method === "WHOLE") {
      // 온주 간편 = 시장가. 지정가(호가창)는 '주문방법 변경하기'에서 (이슈 ②)
      wholeOrder.mutate(
        { clientOrderId, stockCode, market, side, orderType: "MARKET", quantity: qty },
        opts,
      );
    } else if (side === "BUY") {
      buyOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "AMOUNT", amount: orderAmount.toNumber() },
        opts,
      );
    } else {
      sellOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "AMOUNT", amount: orderAmount.toNumber() },
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
              <ChangeIndicator value={detail.price.changeRate} percent size="sm" />
            </span>
          </span>
        }
      />

      <div className="space-y-5">
        {/* 소수점 | 온주 */}
        <SegmentedControl<Method>
          options={[
            { label: "소수점", value: "FRACTION" },
            { label: "온주", value: "WHOLE" },
          ]}
          value={method}
          onChange={changeMethod}
        />

        {/* 수량/금액 입력 카드 */}
        <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
          {/* 수량으로 | 금액으로 */}
          <div className="flex items-center gap-2 text-sm font-bold">
            <button
              type="button"
              onClick={() => changeInputMode("QTY")}
              className={cn(
                inputMode === "QTY" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              수량으로
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={() => changeInputMode("AMOUNT")}
              className={cn(
                inputMode === "AMOUNT"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              금액으로
            </button>
          </div>

          {inputMode === "QTY" ? (
            <>
              <Stepper
                value={qty}
                onChange={onQtyChange}
                step={method === "WHOLE" ? 1 : 0.1}
                min={0}
                precision={method === "WHOLE" ? 0 : 4}
                suffix="주"
                editable
              />
              <div className="flex gap-2">
                {[1, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onQtyChange(qty + n)}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    +{n}주
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onQtyChange(maxQtyValue)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  최대
                </button>
              </div>
            </>
          ) : (
            <>
              <AmountInput
                value={amount}
                onChange={onAmountChange}
                placeholder="매수 금액"
              />
              <QuickAmountChips
                options={[
                  { label: "10%", value: new Decimal(buyingPower).times(0.1).toDecimalPlaces(amountDp).toNumber() },
                  { label: "25%", value: new Decimal(buyingPower).times(0.25).toDecimalPlaces(amountDp).toNumber() },
                  { label: "50%", value: new Decimal(buyingPower).times(0.5).toDecimalPlaces(amountDp).toNumber() },
                  { label: "최대", value: "max" },
                ]}
                onSelect={(v) =>
                  onAmountChange(v === "max" ? buyingPower : v)
                }
              />
            </>
          )}
        </div>

        {/* 부족금액 자동충전 */}
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            부족금액 자동충전
          </span>
          <Switch checked={autoCharge} onCheckedChange={setAutoCharge} />
        </label>

        {/* 매수 가능 / 판매 수량 */}
        <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">매수 가능</p>
            <p className="font-numeric text-base font-bold text-primary">
              {fmtAmount(buyingPower)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">판매 수량</p>
            <p className="font-numeric text-base font-bold text-primary">
              {formatShares(holdingQty)}주
            </p>
          </div>
        </div>

        {/* 매수 / 매도 */}
        <div className="flex gap-3">
          <Button
            onClick={() => submit("BUY")}
            disabled={pending || !valid}
            className="h-12 flex-1 bg-up text-base font-bold text-white hover:bg-up/90"
          >
            매수
          </Button>
          <Button
            onClick={() => submit("SELL")}
            disabled={pending || !valid}
            className="h-12 flex-1 bg-down text-base font-bold text-white hover:bg-down/90"
          >
            매도
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          수수료 {FEE_RATE * 100}% · 약 {fmtAmount(fee.toDecimalPlaces(amountDp).toNumber())}
        </p>

        {/* 온주: 호가창(지정가) 매매로 이동 (이슈 ②) */}
        {method === "WHOLE" && (
          <button
            type="button"
            onClick={() => router.push(`/trading/${stockCode}/orderbook`)}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            주문방법 변경하기 (호가창)
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </>
  );
}
