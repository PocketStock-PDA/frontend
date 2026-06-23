import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DormantCloseResult } from "@/types/domain/asset";

/**
 * 휴면계좌 일괄 해지 → 잔액 CMA 풀로 이체 (POST /api/assets/dormant/close).
 * 바디: { accountIds: number[] }.
 */
export function useCloseDormant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountIds: number[]) =>
      api.post<DormantCloseResult>("/api/assets/dormant/close", { accountIds }),
    onSuccess: () => {
      // 해지·이체 후 휴면 목록·자산·CMA 갱신
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
    },
    retry: false,
  });
}
