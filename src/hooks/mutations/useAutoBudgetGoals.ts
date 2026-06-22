import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { AutoBudgetGoalResponse } from "@/types/domain/budget";

export function useAutoBudgetGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<AutoBudgetGoalResponse>("/api/budget/goals/auto", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budget.all });
    },
  });
}
