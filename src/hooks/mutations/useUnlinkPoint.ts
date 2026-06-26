import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

/**
 * 제휴사 포인트 연동 해제 (DELETE /api/assets/links/point/{companyCode}).
 * 해제 후 기관 목록·CMA 홈(포인트 잔액) 캐시 갱신.
 */
export function useUnlinkPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyCode: string) =>
      api.delete<void>(`/api/assets/links/point/${companyCode}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
    },
    retry: false,
  });
}
