import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderResult, SellOrderRequest } from "@/types/domain/order";

/**
 * 소수점 매도 (POST /api/trading/orders/fractional, side=SELL).
 * orderType=AMOUNT(부분) / ALL(전량). market은 stockCode에서 파생하므로 전송하지 않는다.
 * 성공 시 보유/시세/내역 무효화.
 */
export function useSellOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SellOrderRequest) =>
      api.post<OrderResult>("/api/trading/orders/fractional", {
        clientOrderId: req.clientOrderId,
        stockCode: req.stockCode,
        side: "SELL",
        orderType: req.orderType,
        ...(req.orderType === "AMOUNT" ? { amount: req.amount } : {}),
        ...(req.orderType === "QUANTITY" ? { quantity: req.quantity } : {}),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
