import Decimal from "decimal.js";

interface WholeShareDividendParams {
  /** 매수금액(원) */
  buyAmountKrw: number;
  /** 현재가 — native 통화(국내 KRW, 해외 USD). 없으면 계산 불가. */
  currentPrice: number | null;
  /** 1주당 배당금 — 시장 무관 원화(KRW). 없으면 계산 불가. */
  perShareDividend: number | null;
  /** 해외(US) 종목 여부 — 매수금액(원)을 달러로 환산해 주수를 구해야 한다. */
  isUS: boolean;
  /** USD/KRW 매매기준율(1달러 = N원). 해외 종목 '주수' 환산용, 없으면 해외는 계산 불가. */
  usdKrwRate: number | null;
}

/**
 * 온주(정수 주식) 기준 연 배당액(원).
 *
 * 배당은 보유 '온주' 수에만 붙으므로, 매수금액으로 살 수 있는 정수 주식 수(소수점 버림)에
 * 1주당 배당금(원화)을 곱한다. 해외는 현재가가 달러라 매매기준율로 원→달러 환산해 '주수'만 구하고,
 * 1주당 배당금은 시장 무관 원화이므로 환율을 다시 곱하지 않는다.
 *
 * 1주당 배당금·현재가가 없거나(해외인데 환율도 없으면) 계산할 수 없어 null을 반환한다.
 * 살 수 있는 온주가 0주면 0을 반환한다(매수금액 < 1주 가격).
 */
export function annualWholeShareDividendKrw({
  buyAmountKrw,
  currentPrice,
  perShareDividend,
  isUS,
  usdKrwRate,
}: WholeShareDividendParams): number | null {
  if (perShareDividend === null || currentPrice === null || currentPrice <= 0) {
    return null;
  }

  let shares;
  if (isUS) {
    if (!usdKrwRate || usdKrwRate <= 0) return null;
    // 현재가가 달러라 매수금액(원)을 달러로 환산해 온주 수를 구한다.
    const usdAmount = new Decimal(buyAmountKrw).dividedBy(usdKrwRate);
    shares = usdAmount.dividedBy(currentPrice).floor();
  } else {
    shares = new Decimal(buyAmountKrw).dividedBy(currentPrice).floor();
  }
  if (shares.lte(0)) return 0;
  // 1주당 배당금은 원화 — 환율 재곱하지 않는다.
  return shares.times(perShareDividend).toDecimalPlaces(0).toNumber();
}
