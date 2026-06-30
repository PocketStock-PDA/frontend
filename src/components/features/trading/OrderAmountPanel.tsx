"use client";

import Decimal from "decimal.js";
import { Stepper } from "@/components/common/Stepper";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";

const AMOUNT_CHIPS_KRW = [1000, 5000, 10000];
const AMOUNT_CHIPS_USD = [1, 5, 10];

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(6).toString();
}

export interface OrderAmountPanelProps {
  amountMode: "AMOUNT" | "QTY";
  onAmountModeChange: (v: "AMOUNT" | "QTY") => void;

  isUSD: boolean;
  showKrw: boolean;
  fx: number | null;

  /** 항상 native 통화(USD or KRW)로 보관 */
  amount: number;
  onAmountChange: (v: number) => void;
  /** native 통화 기준 구매력 */
  buyingPower: number;
  /** QTY 모드 info row용 최대 수량 (페이지에서 계산해서 전달) */
  maxBuyQty: number;

  qty: number;
  onQtyChange: (v: number) => void;
  /** 소수점 지원 여부 — step·precision 에 사용 */
  fractional?: boolean;
  /** 수량 칩 목록 (기본: fractional=false → [1,5,10], true → [0.1,0.5,1]) */
  qtyChips?: number[];

  /** false이면 "금액으로" 버튼을 숨김 (온주 매수·매도 등 금액모드 불가 케이스) */
  showAmountMode?: boolean;
  qtyPlaceholder?: string;
  amountPlaceholder?: string;
  infoLabel?: string;
}

export function OrderAmountPanel({
  amountMode,
  onAmountModeChange,
  isUSD,
  showKrw,
  fx,
  amount,
  onAmountChange,
  buyingPower,
  maxBuyQty,
  qty,
  onQtyChange,
  fractional = false,
  qtyChips,
  showAmountMode = true,
  qtyPlaceholder = "몇 주 모을까요?",
  amountPlaceholder = "모으기 금액",
  infoLabel = "구매 가능",
}: OrderAmountPanelProps) {
  const amountDp = isUSD ? 2 : 0;
  const resolvedQtyChips = qtyChips ?? (fractional ? [0.1, 0.5, 1] : [1, 5, 10]);

  // 표시 금액 (AMOUNT 모드 — 원화 토글 시 환산)
  const displayAmount = showKrw && fx
    ? toDecimal(amount).times(fx).toDecimalPlaces(0).toNumber()
    : amount;
  const handleAmountChange = (v: number) => {
    const native = showKrw && fx
      ? toDecimal(v).div(fx).toDecimalPlaces(amountDp).toNumber()
      : v;
    onAmountChange(native);
  };

  // 금액 포맷 (구매가능 표시용)
  const fmtPower = () => {
    if (isUSD && !showKrw) return formatUSD(buyingPower);
    if (isUSD && showKrw && fx) return formatKRW(toDecimal(buyingPower).times(fx).toNumber());
    return formatKRW(buyingPower);
  };

  return (
    <div className="space-y-3">
      {/* 수량으로 / 금액으로 */}
      <div className="flex items-center gap-3 text-sm font-bold">
        <button
          type="button"
          onClick={() => onAmountModeChange("QTY")}
          className={cn(amountMode === "QTY" ? "text-foreground" : "text-muted-foreground")}
        >
          수량으로
        </button>
        {showAmountMode && (
          <>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={() => onAmountModeChange("AMOUNT")}
              className={cn(amountMode === "AMOUNT" ? "text-foreground" : "text-muted-foreground")}
            >
              금액으로
            </button>
          </>
        )}
      </div>

      {amountMode === "QTY" ? (
        <>
          <Stepper
            value={qty}
            onChange={onQtyChange}
            step={fractional ? 0.1 : 1}
            min={0}
            precision={fractional ? 6 : 0}
            suffix="주"
            placeholder={qtyPlaceholder}
            editable
          />
          <div className="flex gap-2">
            {resolvedQtyChips.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  onQtyChange(
                    new Decimal(qty)
                      .plus(n)
                      .toDecimalPlaces(fractional ? 4 : 0)
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
              disabled={maxBuyQty <= 0}
              onClick={() => onQtyChange(maxBuyQty)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              최대
            </button>
          </div>
        </>
      ) : (
        <>
          <Stepper
            value={displayAmount}
            onChange={handleAmountChange}
            step={!isUSD || showKrw ? 1000 : 1}
            min={0}
            precision={showKrw ? 0 : amountDp}
            suffix={isUSD && !showKrw ? "달러" : "원"}
            placeholder={amountPlaceholder}
            editable
          />
          <div className="flex gap-2">
            {(isUSD && !showKrw ? AMOUNT_CHIPS_USD : AMOUNT_CHIPS_KRW).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  if (showKrw && fx) {
                    const newKrw = toDecimal(amount).times(fx).plus(n).toDecimalPlaces(0).toNumber();
                    onAmountChange(toDecimal(newKrw).div(fx).toDecimalPlaces(amountDp).toNumber());
                  } else {
                    onAmountChange(new Decimal(amount).plus(n).toDecimalPlaces(amountDp).toNumber());
                  }
                }}
                className="flex-1 rounded-lg border border-border bg-background py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                +{isUSD && !showKrw ? `$${n}` : `${n.toLocaleString("ko-KR")}원`}
              </button>
            ))}
            <button
              type="button"
              disabled={buyingPower <= 0}
              onClick={() =>
                onAmountChange(new Decimal(buyingPower).toDecimalPlaces(amountDp).toNumber())
              }
              className="flex-1 rounded-lg border border-border bg-background py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              최대
            </button>
          </div>
        </>
      )}

      {/* 구매 가능 / 모으기 가능 */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">{infoLabel}</span>
        <span className="font-numeric text-sm font-bold text-foreground">
          {amountMode === "AMOUNT"
            ? fmtPower()
            : `${formatShares(new Decimal(maxBuyQty))}주`}
        </span>
      </div>
    </div>
  );
}
