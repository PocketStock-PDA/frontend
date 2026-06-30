"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useOrderNotification } from "@/hooks/useOrderNotification";
import { invalidateTradingData } from "@/lib/utils/invalidateTradingData";

/**
 * 앱 로드 시 체결통보 WS를 상시 구독 — 체결/거부/취소 이벤트가 오면
 * invalidateTradingData로 관련 캐시 전체를 즉시 무효화한다.
 *
 * UI 없음. (main)/layout 에 마운트.
 */
export function TradingSync() {
  const queryClient = useQueryClient();
  useOrderNotification(() => { invalidateTradingData(queryClient); });
  return null;
}
