import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

/** 절약금 모으기 동의 (POST /api/budget/savings/agree) */
export function useAgreeCollect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/api/budget/savings/agree", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.savings });
    },
    retry: false,
  });
}
