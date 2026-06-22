import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { BuyOrderRequest, OrderResult } from "@/types/domain/order";

/**
 * 소수점 매수 (POST /api/trading/orders/buy).
 * ⚠️ 백엔드 미구현 — 문서 스펙 기준 선구현. 성공 시 보유/시세/내역 무효화.
 */
export function useBuyOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: BuyOrderRequest) =>
      api.post<OrderResult>("/api/trading/orders/buy", req),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
