import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderResult, SellOrderRequest } from "@/types/domain/order";

/**
 * 소수점 매도 (POST /api/trading/orders/sell).
 * ⚠️ 백엔드 미구현 — 문서 스펙 기준 선구현. 성공 시 보유/시세/내역 무효화.
 */
export function useSellOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SellOrderRequest) =>
      api.post<OrderResult>("/api/trading/orders/sell", req),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
