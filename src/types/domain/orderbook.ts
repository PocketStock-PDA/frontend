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
}
