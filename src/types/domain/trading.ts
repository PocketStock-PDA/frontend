// 거래/보유/종목 (ledger-api)

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
