import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CollectResult } from "@/types/domain/cma";

/**
 * 잔돈 모으기 실행 (POST /api/cma/collect) — 구현됨.
 * 응답은 소스별 결과 배열(CollectResult). 성공 시 CMA 홈 데이터 무효화.
 */
export function useCollectChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CollectResult>("/api/cma/collect", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
    },
  });
}
