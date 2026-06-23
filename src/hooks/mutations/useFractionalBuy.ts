import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { OrderResult } from "@/types/domain/order";

export interface FractionalBuyRequest {
  clientOrderId: string;
  stockCode: string;
  orderType: "AMOUNT";
  amount: number;
}

export function useFractionalBuy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: FractionalBuyRequest) =>
      api.post<OrderResult>("/api/trading/orders/fractional/buy", req),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
