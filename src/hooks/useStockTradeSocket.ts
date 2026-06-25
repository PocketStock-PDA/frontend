"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useStompTopic } from "@/hooks/useStompTopic";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { StockDetail, TradeFrame } from "@/types/domain/trading";
import type { OrderBook } from "@/types/domain/orderbook";

/**
 * 실시간 체결(시세) 구독 — issue #10.
 *   국내: /topic/stock/trade/{stockCode}
 *   해외: /topic/foreign/transaction/{stockCode}
 * 구독은 순수 종목코드로만 한다(서버가 세션·시장코드 처리).
 * 받은 체결가로 `trading.stockDetail` 캐시의 price 를 갱신 → 종목 화면 현재가가 실시간 반영.
 * ⚠️ 체결 payload 스키마는 추정(TradeFrame) — 실제 필드 확인 후 조정.
 */
export function useStockTradeSocket(
  stockCode: string,
  options: { overseas?: boolean; enabled?: boolean } = {},
) {
  const { overseas = false, enabled = true } = options;
  const queryClient = useQueryClient();

  const topic = stockCode
    ? overseas
      ? `/topic/foreign/transaction/${stockCode}`
      : `/topic/stock/trade/${stockCode}`
    : null;

  useStompTopic<TradeFrame>(
    topic,
    (frame) => {
      if (frame?.currentPrice === undefined) return;
      queryClient.setQueryData<StockDetail>(
        queryKeys.trading.stockDetail(stockCode),
        (prev) =>
          prev && prev.price
            ? {
                ...prev,
                price: {
                  ...prev.price,
                  currentPrice: frame.currentPrice,
                  ...(frame.changePrice !== undefined ? { changePrice: frame.changePrice } : {}),
                  ...(frame.changeRate !== undefined ? { changeRate: frame.changeRate } : {}),
                  ...(frame.volume !== undefined ? { volume: frame.volume } : {}),
                },
              }
            : prev,
      );
      // 호가창 캐시의 현재가도 동기화 (실시간 호가 프레임엔 currentPrice가 없음)
      queryClient.setQueryData<OrderBook>(
        queryKeys.trading.orderbook(stockCode),
        (prev) =>
          prev ? { ...prev, currentPrice: frame.currentPrice } : prev,
      );
    },
    enabled,
  );
}
