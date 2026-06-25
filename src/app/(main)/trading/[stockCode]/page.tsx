"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Repeat } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Stepper } from "@/components/common/Stepper";
import { AmountInput } from "@/components/common/AmountInput";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TxnAuthDialog } from "@/components/common/TxnAuthDialog";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useBuyOrder } from "@/hooks/mutations/useBuyOrder";
import { useSellOrder } from "@/hooks/mutations/useSellOrder";
import { useWholeOrder } from "@/hooks/mutations/useWholeOrder";
import { useStockTradeSocket } from "@/hooks/useStockTradeSocket";
import { genClientOrderId } from "@/lib/utils/idempotency";
import { toDecimal } from "@/lib/utils/decimal";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { splitOrderToast, wholeOrderToast } from "@/lib/utils/orderResult";
import { cn } from "@/lib/utils";
import type {
  SplitOrderResponse,
  WholeOrderResponse,
} from "@/types/domain/order";

type Method = "FRACTION" | "WHOLE"; // 소수점 / 온주
type InputMode = "QTY" | "AMOUNT"; // 수량으로 / 금액으로
type Side = "BUY" | "SELL";

const FEE_RATE = 0.001; // 수수료 0.1%
const AMOUNT_CHIPS = [5000, 10000, 50000, 100000]; // 금액 빠른 추가(원)

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
  // 실시간 시세(체결) → stockDetail 캐시 갱신 (issue #10)
  useStockTradeSocket(stockCode, {
    overseas: detailQ.data?.currency === "USD",
    enabled: !!detailQ.data,
  });

  const [method, setMethod] = useState<Method>("FRACTION");
  const [inputMode, setInputMode] = useState<InputMode>("QTY");
  const [qty, setQty] = useState(0);
  const [amount, setAmount] = useState(0);
  const [autoCharge, setAutoCharge] = useState(true);
  // 거래 인증 필요(TXN_AUTH_REQUIRED) 시 계좌 비밀번호를 받기 위한 시트 — 인증 후 그 side로 재시도
  const [authSide, setAuthSide] = useState<Side | null>(null);

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
  const minOrder = isUSD ? 0.01 : 1000; // 소수점 최소 주문금액 (국내 1,000원 / 해외 $0.01)

  // 금액 계산은 decimal.js 필수 (README 가이드라인). API 값은 toDecimal로 안전 변환(null→0)
  const price = toDecimal(detail.price?.currentPrice);
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
    // 금액으로는 항상 소수점 고정 (백엔드 전달 값도 소수점)
    if (im === "AMOUNT") setMethod("FRACTION");
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

  const resetAfterSuccess = (side: Side) => {
    orderKeys.current[side] = null; // 키 폐기 → 다음 주문은 새 키
    setQty(0);
    setAmount(0);
  };
  const makeOpts = (side: Side) => ({
    onSuccess: () => {
      resetAfterSuccess(side);
      toast.success(`${side === "BUY" ? "매수" : "매도"} 주문이 접수됐어요`);
    },
    // 실패 시 키 유지 → 같은 주문 재시도 시 동일 키(멱등)
    onError: (err: unknown) => {
      // 거래 인증 미완료: 계좌 비밀번호 시트를 띄우고, 인증되면 동일 키로 재시도
      if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
        setAuthSide(side);
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
        {
          ...opts,
          onSuccess: (data: WholeOrderResponse) => {
            resetAfterSuccess(side);
            const t = wholeOrderToast(data, fmtAmount);
            toast.success(
              t.title,
              t.description ? { description: t.description } : undefined,
            );
          },
        },
      );
      return;
    }
    // 소수점: 금액 모드는 AMOUNT(국내 1,000원 단위), 수량 모드는 QUANTITY(소수 주수, 단위 제약 없음).
    // 수량 모드를 AMOUNT(=수량×가격)로 보내면 1,000원 배수가 아니라 백엔드가 거부함.
    // 최소 주문금액(1,000원·$0.01) 미만은 자동으로 최소금액/최소수량으로 상향 보정.
    let correctedAmount = amount;
    let correctedQty = qty;
    if (inputMode === "AMOUNT") {
      if (amount > 0 && amount < minOrder) {
        correctedAmount = minOrder;
        setAmount(minOrder);
        toast.warning(
          `최소 주문금액은 ${fmtAmount(minOrder)} 이상이에요. ${fmtAmount(minOrder)}으로 맞췄어요`,
        );
      }
    } else if (price.gt(0) && new Decimal(qty).times(price).lt(minOrder)) {
      correctedQty = new Decimal(minOrder)
        .div(price)
        .toDecimalPlaces(4, Decimal.ROUND_UP)
        .toNumber();
      setQty(correctedQty);
      toast.warning(
        `최소 주문금액은 ${fmtAmount(minOrder)} 이상이에요. ${formatShares(new Decimal(correctedQty))}주로 조정했어요`,
      );
    }
    // 보정 후 실제 주문 가능 범위 검증 — 매수 가능 금액 / 매도 가능 수량 초과 시 차단(초과 주문 방지).
    if (side === "BUY") {
      const need =
        inputMode === "AMOUNT"
          ? new Decimal(correctedAmount)
          : new Decimal(correctedQty).times(price);
      if (need.gt(buyingPower)) {
        toast.error("매수 가능 금액을 초과했어요.");
        return;
      }
    } else {
      const sellQty =
        inputMode === "AMOUNT"
          ? price.gt(0)
            ? new Decimal(correctedAmount).div(price)
            : new Decimal(0)
          : new Decimal(correctedQty);
      if (sellQty.gt(holdingQty)) {
        toast.error("보유 수량을 초과했어요.");
        return;
      }
    }
    const orderDetail =
      inputMode === "AMOUNT"
        ? ({ orderType: "AMOUNT", amount: correctedAmount } as const)
        : ({ orderType: "QUANTITY", quantity: correctedQty } as const);
    // 소수점 응답(split)은 결과를 보여준다 — 온주분 즉시체결 / 소수분 차수대기
    const fracOpts = {
      ...opts,
      onSuccess: (data: SplitOrderResponse) => {
        resetAfterSuccess(side);
        const t = splitOrderToast(side, data);
        toast.success(
          t.title,
          t.description ? { description: t.description } : undefined,
        );
      },
    };
    if (side === "BUY") {
      buyOrder.mutate({ clientOrderId, stockCode, market, ...orderDetail }, fracOpts);
    } else {
      sellOrder.mutate({ clientOrderId, stockCode, market, ...orderDetail }, fracOpts);
    }
  };

  return (
    <>
      <AppHeader
        variant="sub"
        title={
          <span className="flex items-center gap-2">
            <Avatar className="size-7">
              {detail.logoUrl && (
                <AvatarImage src={detail.logoUrl} alt={detail.stockName} />
              )}
              <AvatarFallback className="text-[10px]">
                {(detail.stockCode ?? detail.stockName).trim().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">
                {detail.stockName}
              </span>
              <span className="flex items-baseline gap-1.5">
                <AmountDisplay value={price.toString()} size="md" className="font-bold" />
                <ChangeIndicator value={detail.price?.changeRate ?? 0} percent size="sm" />
              </span>
            </span>
          </span>
        }
      />

      <div className="space-y-5">
        {/* 소수점 | 온주 — 수량으로일 때만 (금액으로는 소수점 고정) */}
        {inputMode === "QTY" && (
          <SegmentedControl<Method>
            options={[
              { label: "소수점", value: "FRACTION" },
              { label: "온주", value: "WHOLE" },
            ]}
            value={method}
            onChange={changeMethod}
          />
        )}

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
                placeholder="주문 금액"
              />
              <div className="flex gap-2">
                {AMOUNT_CHIPS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onAmountChange(new Decimal(amount).plus(n).toNumber())}
                    className="flex-1 rounded-lg border border-border bg-background py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    +{n.toLocaleString("ko-KR")}원
                  </button>
                ))}
              </div>
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

        {/* 예상 주문금액 / 수수료 / 결제액 (수량·금액 바꿀 때 실시간 갱신) */}
        {valid && (
          <div className="space-y-1.5 rounded-xl bg-muted/40 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">예상 주문금액</span>
              <span className="font-numeric font-bold text-foreground">
                {fmtAmount(orderAmount.toDecimalPlaces(amountDp).toNumber())}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                예상 수수료 ({FEE_RATE * 100}%)
              </span>
              <span className="font-numeric text-muted-foreground">
                {fmtAmount(fee.toDecimalPlaces(amountDp).toNumber())}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="text-muted-foreground">매수 시 예상 결제액</span>
              <span className="font-numeric font-bold text-primary">
                {fmtAmount(
                  orderAmount.plus(fee).toDecimalPlaces(amountDp).toNumber(),
                )}
              </span>
            </div>
          </div>
        )}

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

        {/* 자동모으기(적립식) 설정 진입 (이슈 ③) */}
        <button
          type="button"
          onClick={() => router.push(`/trading/${stockCode}/auto`)}
          className="flex w-full items-center justify-between rounded-xl bg-muted/60 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2">
            <Repeat className="size-4 text-primary" />
            자동모으기 설정
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </div>

      <TxnAuthDialog
        open={authSide !== null}
        onOpenChange={(o) => {
          if (!o) setAuthSide(null);
        }}
        onVerified={() => {
          const side = authSide;
          setAuthSide(null);
          if (side) submit(side);
        }}
      />
    </>
  );
}
