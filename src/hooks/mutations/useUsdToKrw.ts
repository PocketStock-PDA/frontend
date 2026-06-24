import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

export interface UsdToKrwResult {
  exchangedKrw: number;
  appliedRate: number;
  fee: number;
  triggerType: string;
  remainUsd: number;
}

export function useUsdToKrw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      usdAmount,
      idempotencyKey,
    }: {
      usdAmount: number;
      idempotencyKey: string;
    }) =>
      api.post<UsdToKrwResult>("/api/exchange/usd-to-krw", {
        usdAmount,
        idempotencyKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exchange.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
    },
  });
}
