import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DepositRolloverRequest } from "@/types/domain/deposit";

/** '재예치 없이 CMA로 이체' — 만기 자금 잔여분을 CMA 원화풀로 옮긴다. */
export function useTransferRemainderToCma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DepositRolloverRequest) =>
      api.post<void>("/api/recommendations/maturity/deposit-to-cma", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposit.rollovers });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.home });
    },
  });
}
