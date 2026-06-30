import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

export function useCancelDepositRollover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<void>(`/api/recommendations/maturity/deposit-to-cma/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.deposit.rollovers });
    },
  });
}
