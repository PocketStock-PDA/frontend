// 거래/보유/종목 (ledger-api)

/**
 * 종목 검색·목록용 요약 (리스트 렌더링).
 * ⚠️ GET /api/trading/stocks/search 는 문서 스펙 기준 — 백엔드 미구현 가능 (구현 시 동작)
 */
export interface StockSummary {
  stockCode: string;
  stockName: string;
  logoUrl: string | null;
  currentPrice: number;
  /** 등락률(%) — 예: 1.2 = +1.20% */
  changeRate: number;
  currency: "KRW" | "USD";
}

export interface Holding {
  stockCode: string;
  quantity: number;
  avgBuyPrice: number;
  currency: string;
}

export interface StockPrice {
  stockCode: string;
  currentPrice: number;
  changePrice: number;
  /** 등락률(%) — 예: 1.2 = +1.20% */
  changeRate: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  volume: number;
}

export interface StockDetail {
  stockCode: string;
  stockName: string;
  englishName: string;
  exchange: string;
  standardCode: string;
  currency: string;
  fractional: boolean;
  logoUrl: string | null;
  price: StockPrice;
}

/**
 * 실시간 체결(시세) 프레임 — STOMP push.
 *   국내: /topic/stock/trade/{stockCode}
 *   해외: /topic/foreign/transaction/{stockCode}
 * ⚠️ payload 스키마가 이슈 #10에 명시되지 않음 → 추정(틀). 실제 필드 확인 후 조정.
 */
export interface TradeFrame {
  stockCode: string;
  currentPrice: number;
  changePrice?: number;
  /** 등락률(%) */
  changeRate?: number;
  /** 누적/체결 거래량 */
  volume?: number;
  /** 체결 시각 */
  tradeTime?: string;
}
