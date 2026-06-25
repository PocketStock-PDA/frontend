import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

interface OrderCancelResult {
  orderId: number;
  status: string; // 항상 CANCELLED
}

/**
 * 주문 취소 (DELETE /api/trading/orders/{orderId}).
 * 소수점 QUEUED · 온주 PENDING만 취소 가능(종결 상태는 백엔드 409).
 * 성공 시 보유/시세/내역 무효화.
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) =>
      api.delete<OrderCancelResult>(`/api/trading/orders/${orderId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
