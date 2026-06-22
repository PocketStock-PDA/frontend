import type { StockSummary } from "@/types/domain/trading";

// ⚠️ 임시 mock — 종목 검색/목록 API(GET /api/trading/stocks/search) 미구현.
// 백엔드 연결 시 이 파일과 useStockSearch 의 mock 분기를 제거하면 됨.
export const MOCK_STOCKS: StockSummary[] = [
  { stockCode: "005930", stockName: "삼성전자", logoUrl: null, currentPrice: 76100, changeRate: 1.2, currency: "KRW" },
  { stockCode: "000660", stockName: "SK하이닉스", logoUrl: null, currentPrice: 198500, changeRate: 0.85, currency: "KRW" },
  { stockCode: "035420", stockName: "NAVER", logoUrl: null, currentPrice: 357500, changeRate: 2.3, currency: "KRW" },
  { stockCode: "323410", stockName: "카카오뱅크", logoUrl: null, currentPrice: 19450, changeRate: -0.5, currency: "KRW" },
  { stockCode: "377300", stockName: "마리오뱅크", logoUrl: null, currentPrice: 8200, changeRate: 1.15, currency: "KRW" },
];

/** mock 검색: 종목명/코드 부분 일치 (대소문자 무시) */
export function searchMockStocks(q: string): StockSummary[] {
  const term = q.trim().toLowerCase();
  if (!term) return MOCK_STOCKS;
  return MOCK_STOCKS.filter(
    (s) =>
      s.stockName.toLowerCase().includes(term) ||
      s.stockCode.toLowerCase().includes(term),
  );
}
