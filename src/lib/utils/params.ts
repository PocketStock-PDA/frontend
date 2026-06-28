/**
 * URL 쿼리의 accountId를 유효한 양의 정수로만 파싱한다.
 * "abc"·""·"0"·"-1"·소수 등은 모두 null(서버가 가장 가까운 만기를 자동 선택).
 */
export function parseAccountId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
