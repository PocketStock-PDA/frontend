// 거래/보유/종목 (ledger-api)

/** 시장 구분 (순위 API 경로) */
export type StockMarket = "domestic" | "overseas";
/** 순위 정렬 기준 */
export type RankingSort = "tradevalue" | "marketcap";

/**
 * 종목 순위 항목 (GET /api/trading/stocks/rankings/{market}?sort=).
 * 거래대금·시총을 함께 내려 탭 전환 시 재정렬만으로 충분(해외는 정렬한 지표만 채워짐).
 */
export interface StockRankingItem {
  /** 유니버스 필터 후 1부터 재부여한 순위 */
  rank: number;
  stockCode: string;
  stockName: string;
  exchange: string;
  currency: string;
  /** 현재가 */
  price: number;
  /** 전일대비 등락률(%) */
  changeRate: number;
  /** 거래대금(원/USD) */
  tradingValue: number | null;
  /** 시가총액(원/USD) */
  marketCap: number | null;
  logoUrl: string | null;
}

/**
 * 종목 검색 결과 (GET /api/trading/stocks/search?q=&limit=).
 * 자체 종목마스터 기반 — 현재가는 미포함(상세/시세에서 합성).
 */
export interface StockSearchItem {
  stockCode: string;
  stockName: string;
  englishName: string | null;
  exchange: string;
  secType: string;
  currency: string;
  logoUrl: string | null;
}

export interface Holding {
  stockCode: string;
  quantity: number;
  /** 온주(직접소유, 정수 매도) — quantity − fractionalQty (FRAC-010) */
  wholeQty?: number;
  /** 소수점(신탁, 소수 매도 ≤ 이 값) */
  fractionalQty?: number;
  avgBuyPrice: number;
  currency: string;
}

/** 일별 평가 스냅샷 (GET /api/trading/valuations/{code}). 종가 native·환차손익 제외 */
export interface DailyValuation {
  /** yyyy-MM-dd */
  evalDate: string;
  quantity: number;
  closePrice: number;
  evalAmount: number;
  profitAmount: number;
  /** 수익률(%) */
  profitRate: number;
  currency: string;
}

/** 온주 전환내역 항목 (GET /api/trading/whole-shares) */
export interface WholeShareConversion {
  stockCode: string;
  stockName: string;
  wholeQty: number;
  /** ISO datetime */
  convertedAt: string;
}

/** 온주 전환 결과 (POST /api/trading/whole-shares) */
export interface WholeShareConvertResult {
  stockCode: string;
  convertedWholeQty: number;
  remainingFractional: number;
  wholeQty: number;
  totalQuantity: number;
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
  /** 현재가 — 시세 미합성/조회불가 시 null (방어). 보통 국내·해외 모두 채워짐 */
  price: StockPrice | null;
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
