import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderBook } from "@/types/domain/orderbook";

/**
 * 호가창 조회 (GET /api/trading/stocks/{code}/orderbook) — 구현됨.
 * TODO: 실시간(STOMP/SockJS)으로 호가 갱신은 백엔드 WS 토픽·메시지 스펙 확인 후
 *   useStockQuoteSocket 구독 → setQueryData 로 붙이기.
 */
export function useOrderBook(stockCode: string) {
  return useQuery({
    queryKey: queryKeys.trading.orderbook(stockCode),
    queryFn: () =>
      api.get<OrderBook>(`/api/trading/stocks/${stockCode}/orderbook`),
    enabled: !!stockCode,
  });
}
