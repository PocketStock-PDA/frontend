import Decimal from "decimal.js";
import { toDecimal } from "@/lib/utils/decimal";

// 1주 = 100조각. 퍼즐(조각)은 "소수 잔여분" 차원을 표현한다.
export const PIECES_PER_SHARE = 100;

export interface PieceParts {
  /** 정수 주(온주분) */
  whole: number;
  /** 소수 잔여분을 조각으로 환산 — 정수 버림(0~99). 표시는 항상 정수 조각. */
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
    // 조각은 정수로 버림(floor) — 0.7338주 → 73조각(73.38 아님). 보유 주수는 별도로 소수 유지.
    pieces: fracPieces.floor().toNumber(),
    hasFraction: fracPieces.gt(0),
  };
}

/** 조각 수 표기 — 항상 정수(버림). 1주=100조각 기준(잔여 조각은 0~99). */
export function formatPieces(pieces: number): string {
  return String(Math.floor(pieces));
}

/** "5주 11조각" / "0주 0.4조각" — 보유량 정직 표기(온주+조각). */
export function formatHoldingShort(
  quantity: number | string | null | undefined,
): string {
  const { whole, pieces } = toPieceParts(quantity);
  return `${whole.toLocaleString("ko-KR")}주 ${formatPieces(pieces)}조각`;
}

/** "0.003067" / "5.11" — 단위 없는 소수점 수량 문자열(6자리, trailing zero 제거). */
export function formatShares(quantity: Decimal | number | string | null | undefined): string {
  return (quantity instanceof Decimal ? quantity : toDecimal(quantity))
    .toDecimalPlaces(6)
    .toString();
}

/** "0.0031주" / "5.11주" — 소수점 수량 표기(trailing zero 제거, 6자리). */
export function formatQuantity(
  quantity: number | string | null | undefined,
): string {
  return `${toDecimal(quantity).toDecimalPlaces(6).toString()}주`;
}
