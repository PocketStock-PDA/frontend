import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CollectResult } from "@/types/domain/cma";

export type CollectSourceKind = "account" | "card" | "point" | "fx";

/**
 * 소스별 잔돈 적립 (POST /api/cma/collect/{source}).
 * - account: 계좌 끝전(잔액 % threshold; 잔액<threshold면 전액)
 * - card:    카드 라운드업
 * - point/fx: 포인트/외화
 * 활성화된 해당 소스 수집설정 기준으로 동작한다.
 */
export function useCollectSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (source: CollectSourceKind) =>
      api.post<CollectResult>(`/api/cma/collect/${source}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all });
    },
    retry: false,
  });
}
