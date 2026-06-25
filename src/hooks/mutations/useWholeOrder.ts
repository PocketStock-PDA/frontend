import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderResult, WholeOrderRequest } from "@/types/domain/order";

/**
 * 온주(정수 주) 매수/매도 (POST /api/trading/orders/whole).
 * clientOrderId 멱등키 필수(issue #4). market은 백엔드가 stockCode에서 파생(전송돼도 무시).
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
