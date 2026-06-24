import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { KrwToUsdResult } from "@/types/domain/exchange";

export function useKrwToUsd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      krwAmount,
      idempotencyKey,
    }: {
      krwAmount: number;
      idempotencyKey: string;
    }) =>
      api.post<KrwToUsdResult>("/api/exchange/krw-to-usd", {
        krwAmount,
        idempotencyKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exchange.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
    },
  });
}
