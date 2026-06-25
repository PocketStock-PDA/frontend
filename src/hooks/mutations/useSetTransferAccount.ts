import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

/** 절약금 이체 계좌 등록/변경 (PUT /api/budget/savings/transfer-account) */
export function useSetTransferAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) =>
      api.put<void>("/api/budget/savings/transfer-account", { accountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.transferAccount });
    },
    retry: false,
  });
}
