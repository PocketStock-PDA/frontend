import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/utils/queryKeys";
import { searchMockStocks } from "@/lib/mock/stocks";
import type { StockSummary } from "@/types/domain/trading";

/**
 * 종목 검색·목록 (GET /api/trading/stocks/search?q=).
 * ⚠️ 백엔드 미구현 — 현재 mock 데이터 반환(틀). 구현 시 queryFn 을 아래 주석처럼 교체.
 *   queryFn: () => api.get<StockSummary[]>("/api/trading/stocks/search", { params: q ? { q } : {} })
 * 입력 디바운스는 호출부 책임. 입력 중 깜빡임 방지로 이전 데이터 유지.
 */
export function useStockSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: queryKeys.trading.search(q),
    queryFn: async (): Promise<StockSummary[]> => searchMockStocks(q),
    placeholderData: keepPreviousData,
  });
}
