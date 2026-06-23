import Decimal from "decimal.js";
import { toDecimal } from "@/lib/utils/decimal";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN });

// 1234567 → "1,234,567원" (백엔드 숫자 필드 null 가능 → toDecimal이 0으로 방어)
export const formatKRW = (amount: number | string | null | undefined): string =>
  toDecimal(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";

// 1234.5 → "$1,234.50"
export const formatUSD = (amount: number | string | null | undefined): string =>
  "$" + toDecimal(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// 0.1 + 0.2 = 0.3 (정확)
export const addAmount = (a: number | string, b: number | string): number =>
  new Decimal(a).plus(b).toNumber();

// 잔액 차감
export const subtractAmount = (
  a: number | string,
  b: number | string,
): number => new Decimal(a).minus(b).toNumber();

// 수수료 계산 (amount * rate)
export const calcFee = (
  amount: number | string,
  rate: number | string,
): number => new Decimal(amount).times(rate).toNumber();

// "1,234,567원" → 1234567
export const parseAmount = (value: string): number => {
  const cleaned = value.replace(/[,원$\s]/g, "");
  const d = new Decimal(cleaned);
  if (d.isNaN()) throw new Error("숫자만 입력해 주세요.");
  if (d.isNegative()) throw new Error("금액은 0원 이상이어야 합니다.");
  return d.toNumber();
};
