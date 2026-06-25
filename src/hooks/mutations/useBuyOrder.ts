import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { BuyOrderRequest, OrderResult } from "@/types/domain/order";

/**
 * 소수점 매수 (POST /api/trading/orders/fractional, side=BUY).
 * 백엔드가 정수부=온주 즉시체결 / 소수부=차수배치로 split 처리.
 * market은 stockCode→exchange에서 파생하므로 전송하지 않는다. 성공 시 보유/시세/내역 무효화.
 */
export function useBuyOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: BuyOrderRequest) =>
      api.post<OrderResult>("/api/trading/orders/fractional", {
        clientOrderId: req.clientOrderId,
        stockCode: req.stockCode,
        side: "BUY",
        orderType: req.orderType,
        ...(req.orderType === "AMOUNT"
          ? { amount: req.amount }
          : { quantity: req.quantity }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
