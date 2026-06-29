import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DepositRolloverRequest } from "@/types/domain/deposit";

/** '예금 재예치' 생성 — 만기 자금 일부를 예적금 상품으로 재예치. */
export function useCreateDepositRollover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DepositRolloverRequest) =>
      api.post<void>("/api/recommendations/maturity/deposit-rollover", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposit.rollovers });
    },
  });
}
