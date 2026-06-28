import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderHistoryItem } from "@/types/domain/order";

/** 미체결 주문 조회 (GET /api/trading/orders/pending) — PENDING(온주 지정가) + QUEUED(소수점 차수) */
export function usePendingOrders() {
  return useQuery({
    queryKey: queryKeys.trading.pendingOrders,
    queryFn: () => api.get<OrderHistoryItem[]>("/api/trading/orders/pending"),
  });
}
