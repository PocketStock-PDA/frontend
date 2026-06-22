"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useStompTopic } from "@/hooks/useStompTopic";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { AskingFrame, OrderBook } from "@/types/domain/orderbook";

/**
 * 실시간 호가 구독 (STOMP /topic/asking/{stockCode}) — issue #2.
 * 진입 시 REST 스냅샷(useOrderBook)으로 그린 뒤, 실시간 틱으로 **사다리·총잔량만** 갱신한다.
 * 현재가·상하한가는 실시간 프레임에 없으므로 스냅샷 값을 유지한다.
 */
export function useStockQuoteSocket(stockCode: string, enabled = true) {
  const queryClient = useQueryClient();

  useStompTopic<AskingFrame>(
    stockCode ? `/topic/asking/${stockCode}` : null,
    (frame) => {
      if (!frame?.asks || !frame?.bids) return;
      queryClient.setQueryData<OrderBook>(
        queryKeys.trading.orderbook(stockCode),
        (prev) => {
          if (!prev) return prev;
          const asOf = frame.quoteTime ?? prev.asOf;
          return {
            ...prev, // 현재가·상하한가는 스냅샷 유지
            asks: frame.asks,
            bids: frame.bids,
            totalAskVolume: frame.totalAskVolume,
            totalBidVolume: frame.totalBidVolume,
            ...(asOf !== undefined ? { asOf } : {}),
          };
        },
      );
    },
    enabled,
  );
}
