import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderHistoryItem } from "@/types/domain/order";

/** 주문 내역 조회 (GET /api/trading/orders) */
export function useOrders() {
  return useQuery({
    queryKey: queryKeys.trading.orders,
    queryFn: () => api.get<OrderHistoryItem[]>("/api/trading/orders"),
  });
}
