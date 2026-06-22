import Decimal from "decimal.js";

/**
 * API 값을 안전하게 Decimal로 변환. null·undefined·빈값·NaN 등 잘못된 값은 0.
 * (new Decimal(null) 은 [DecimalError] Invalid argument 를 던지므로 직접 호출 금지)
 */
export function toDecimal(
  value: number | string | null | undefined,
): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}
