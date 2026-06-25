import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { StockSearchItem } from "@/types/domain/trading";

/**
 * 종목 검색 (GET /api/trading/stocks/search?q=&limit=).
 * 자체 종목마스터 부분일치 — 빈 검색어면 호출 안 함. 입력 중 깜빡임 방지로 이전 결과 유지.
 */
export function useStockSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: queryKeys.trading.search(q),
    queryFn: () =>
      api.get<StockSearchItem[]>("/api/trading/stocks/search", {
        params: { q, limit: "20" },
      }),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  });
}
