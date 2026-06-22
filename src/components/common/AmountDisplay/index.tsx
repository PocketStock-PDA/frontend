import Decimal from "decimal.js";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

type Currency = "KRW" | "USD";
type Size = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl font-semibold",
  xl: "text-3xl font-semibold", // 잔액 카드 히어로용
};

export interface AmountDisplayProps {
  value: number | string;
  currency?: Currency;
  size?: Size;
  /** 입출금 ± 표기 (양수 +, 음수 -) */
  signed?: boolean;
  className?: string;
}

/**
 * 금액 표시. currency util과 연동, Inter(font-numeric) 적용.
 */
export function AmountDisplay({
  value,
  currency = "KRW",
  size = "md",
  signed = false,
  className,
}: AmountDisplayProps) {
  // Decimal로 절댓값/부호 계산 (Number 사전 변환 시 정밀도 손실 방지)
  const d = new Decimal(value);
  const abs = d.abs().toString();
  const formatted = currency === "USD" ? formatUSD(abs) : formatKRW(abs);
  const sign = signed ? (d.gt(0) ? "+" : d.lt(0) ? "-" : "") : "";

  return (
    <span
      className={cn(
        "font-numeric tabular-nums text-foreground",
        sizeMap[size],
        className,
      )}
    >
      {sign}
      {formatted}
    </span>
  );
}
