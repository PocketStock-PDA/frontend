import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type {
  RankingSort,
  StockMarket,
  StockRankingItem,
} from "@/types/domain/trading";

/**
 * 종목 실시간 순위 (GET /api/trading/stocks/rankings/{market}?sort=).
 * market=domestic|overseas, sort=tradevalue(거래대금)|marketcap(시가총액). 각 조합은 별도 캐시.
 */
export function useStockRankings(market: StockMarket, sort: RankingSort) {
  return useQuery({
    queryKey: queryKeys.trading.rankings(market, sort),
    queryFn: () =>
      api.get<StockRankingItem[]>(`/api/trading/stocks/rankings/${market}`, {
        params: { sort },
      }),
    refetchInterval: 60_000,
  });
}
