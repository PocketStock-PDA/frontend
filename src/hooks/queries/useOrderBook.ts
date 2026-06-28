import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderBook } from "@/types/domain/orderbook";

export type OrderBookMarket = "domestic" | "overseas";

/**
 * 호가창 조회 (GET /api/trading/stocks/{code}/orderbook?market=domestic|overseas).
 * 백엔드는 Redis 스냅샷 폴백 포함 — 장외·실패 시 마지막 캐시값 반환.
 * useStockBestAsk에서 15초 polling 소스로 사용.
 */
export function useOrderBook(
  stockCode: string,
  market: OrderBookMarket = "domestic",
  options?: { refetchInterval?: number; enabled?: boolean },
) {
  const isOverseas = market === "overseas";
  return useQuery<OrderBook>({
    queryKey: isOverseas
      ? queryKeys.trading.orderbookForeign(stockCode)
      : queryKeys.trading.orderbook(stockCode),
    queryFn: () =>
      api.get<OrderBook>(
        `/api/trading/stocks/${stockCode}/orderbook${isOverseas ? "?market=overseas" : ""}`,
      ),
    enabled: !!stockCode && options?.enabled !== false,
    staleTime: 10_000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}
