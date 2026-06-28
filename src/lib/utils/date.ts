/**
 * 백엔드 LocalDateTime은 UTC 값이지만 Z(오프셋) 없이 직렬화됨("2026-06-29T01:30:00").
 * 브라우저는 오프셋 없는 datetime을 로컬(KST)로 파싱 → 9시간 차이 발생.
 * Z를 붙여 UTC로 강제 해석해 KST 브라우저에서 올바른 시각으로 변환한다.
 *
 * "YYYY-MM-DD"(date-only)는 ECMAScript 스펙상 UTC midnight으로 파싱되므로 그대로 둔다.
 */
export function parseUTC(isoStr: string): Date {
  if (!isoStr) return new Date(NaN);
  if (
    isoStr.length > 10 &&
    isoStr.includes("T") &&
    !isoStr.endsWith("Z") &&
    !/[+-]\d{2}:\d{2}$/.test(isoStr)
  ) {
    return new Date(isoStr + "Z");
  }
  return new Date(isoStr);
}
