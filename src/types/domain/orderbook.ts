// 호가창 (온주 지정가 매매) — GET /api/trading/stocks/{code}/orderbook (구현됨)

export interface OrderBookEntry {
  /** 1=최우선 호가 */
  rank: number;
  price: number;
  /** 잔량(주) */
  volume: number;
}

export interface OrderBook {
  stockCode: string;
  currentPrice: number;
  /** 상한가 */
  upperLimit: number;
  /** 하한가 */
  lowerLimit: number;
  /** 매도호가 — rank1=최저가(최우선), 가격 오름차순 */
  asks: OrderBookEntry[];
  /** 매수호가 — rank1=최고가(최우선), 가격 내림차순 */
  bids: OrderBookEntry[];
  /** 통합 총매도 잔량 */
  totalAskVolume: number;
  /** 통합 총매수 잔량 */
  totalBidVolume: number;
  /** 호가 기준 시각 */
  asOf?: string;
}

/**
 * 실시간 호가 (STOMP /topic/asking/{stockCode} push, AskingResponse).
 * 현재가·상하한가는 없음 → 스냅샷(OrderBook) 값 유지, 사다리·총잔량·누적거래량만 갱신.
 */
export interface AskingFrame {
  stockCode: string;
  /** 호가시간(hotime) */
  quoteTime?: string;
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  totalAskVolume: number;
  totalBidVolume: number;
  /** 누적거래량 */
  accumVolume?: number;
}
