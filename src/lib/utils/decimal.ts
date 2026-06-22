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
    // decimal.js는 NaN/Infinity에 예외를 안 던지고 유효 인스턴스를 만들므로 별도 검사
    const d = new Decimal(value);
    return d.isFinite() ? d : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}
