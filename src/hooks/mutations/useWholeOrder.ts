import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderResult, WholeOrderRequest } from "@/types/domain/order";

/**
 * 온주(정수 주) 매수/매도 (POST /api/trading/orders/whole).
 * ⚠️ 백엔드 미구현 — 문서 스펙 기준 선구현. clientOrderId 멱등키 필수(issue #4).
 * 성공 시 보유/시세/내역 무효화.
 */
export function useWholeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: WholeOrderRequest) =>
      api.post<OrderResult>("/api/trading/orders/whole", req),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
