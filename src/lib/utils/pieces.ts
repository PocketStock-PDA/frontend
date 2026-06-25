import { toDecimal } from "@/lib/utils/decimal";

// 1주 = 100조각. 퍼즐(조각)은 "소수 잔여분" 차원을 표현한다.
export const PIECES_PER_SHARE = 100;

export interface PieceParts {
  /** 정수 주(온주분) */
  whole: number;
  /** 소수 잔여분을 조각으로 환산(0~100, 소수 가능) */
  pieces: number;
  /** 소수 잔여분이 있는지 — 조각 렌즈 대상 여부 */
  hasFraction: boolean;
}

/** 보유 수량 → 온주/조각 분해. 5.11주 → {whole:5, pieces:11} */
export function toPieceParts(
  quantity: number | string | null | undefined,
): PieceParts {
  const q = toDecimal(quantity);
  const whole = q.floor();
  const fracPieces = q.minus(whole).times(PIECES_PER_SHARE);
  return {
    whole: whole.toNumber(),
    pieces: fracPieces.toNumber(),
    hasFraction: fracPieces.gt(0),
  };
}

/** 조각 수 표기 — 정수면 정수, 아니면 1자리(0.4조각). 1주=100조각 기준 0~100. */
export function formatPieces(pieces: number): string {
  const rounded = Math.round(pieces * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** "5주 11조각" / "0주 0.4조각" — 보유량 정직 표기(온주+조각). */
export function formatHoldingShort(
  quantity: number | string | null | undefined,
): string {
  const { whole, pieces } = toPieceParts(quantity);
  return `${whole.toLocaleString("ko-KR")}주 ${formatPieces(pieces)}조각`;
}
