"use client";

import { useState } from "react";
import { useStompTopic } from "@/hooks/useStompTopic";
import { useOrderBook } from "@/hooks/queries/useOrderBook";
import type { AskingFrame, ForeignQuoteFrame } from "@/types/domain/orderbook";

export type BestAskSource = "ws" | "rest" | "current";

export interface BestAskResult {
  /** 최우선 매도호가. null이면 시세 미수신 — 호출측에서 주문 비활성 처리. */
  bestAsk: number | null;
  /** 데이터 출처: ws=실시간, rest=REST polling(Redis 캐시), current=체결가 폴백 */
  source: BestAskSource;
}

function firstPositivePrice(
  asks: { price: number }[] | undefined,
): number | null {
  const p = asks?.[0]?.price;
  return p != null && p > 0 ? p : null;
}

/**
 * 종목 최우선 매도호가(best ask) 실시간 조회.
 *
 * 우선순위:
 *   1. STOMP WS 실시간 (백엔드 업스트림 WS 구독 시 — 미체결 주문 존재 등)
 *   2. REST polling 15s (백엔드 MarketSnapshotCache/Redis 캐시 포함)
 *   3. currentPrice (체결가 폴백 — 해외 장외·시세 공백 시)
 *
 * 해외 장외 시간엔 WS·REST 모두 asks price=0 → currentPrice로 자연 폴스루.
 * currentPrice도 없으면 null 반환 — 호출측이 주문 버튼 비활성 처리.
 */
export function useStockBestAsk(
  stockCode: string,
  options: {
    overseas?: boolean;
    /** stockDetail의 currentPrice — 최종 폴백 */
    currentPrice?: number | null;
    enabled?: boolean;
  } = {},
): BestAskResult {
  const { overseas = false, currentPrice, enabled = true } = options;
  const [wsAsk, setWsAsk] = useState<number | null>(null);

  // REST snapshot polling (15s) — 백엔드 Redis 캐시 hit, 공백 시 마지막 스냅샷 반환
  const orderbookQ = useOrderBook(
    stockCode,
    overseas ? "overseas" : "domestic",
    enabled ? { refetchInterval: 15_000 } : undefined,
  );

  // 국내 호가 WS: /topic/asking/{stockCode} (LS UH1)
  useStompTopic<AskingFrame>(
    !overseas && enabled && !!stockCode ? `/topic/asking/${stockCode}` : null,
    (frame) => {
      const ask = firstPositivePrice(frame.asks);
      if (ask !== null) setWsAsk(ask);
    },
    enabled && !overseas,
  );

  // 해외 호가 WS: /topic/foreign/quote/{stockCode} (KIS HDFSASP0)
  useStompTopic<ForeignQuoteFrame>(
    overseas && enabled && !!stockCode
      ? `/topic/foreign/quote/${stockCode}`
      : null,
    (frame) => {
      const ask = firstPositivePrice(frame.asks);
      if (ask !== null) setWsAsk(ask);
    },
    enabled && overseas,
  );

  // 1순위: WS 실시간
  if (wsAsk !== null) return { bestAsk: wsAsk, source: "ws" };

  // 2순위: REST polling (Redis 캐시 포함)
  const restAsk = firstPositivePrice(orderbookQ.data?.asks);
  if (restAsk !== null) return { bestAsk: restAsk, source: "rest" };

  // 3순위: 체결가 폴백 (해외 장외·시세 공백)
  const fallback =
    currentPrice != null && currentPrice > 0 ? currentPrice : null;
  return { bestAsk: fallback, source: "current" };
}
