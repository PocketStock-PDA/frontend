import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

interface GoalItem {
  category: string;
  budget: number;
}

export function useSetManualGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categories: GoalItem[]) =>
      api.post("/api/budget/goals", { categories }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budget.all });
    },
  });
}
