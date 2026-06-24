import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

export interface CollectSettingItem {
  sourceType: "ACCOUNT" | "CARD" | "POINT" | "FX";
  /** 연동 자산 식별자(계좌 id 등) */
  sourceRefId: number;
  enabled: boolean;
  /** 끝전 커팅 기준(1000/5000/10000). 생략 시 기존값 유지 */
  threshold?: number;
}

/** 적립(수집) 설정 저장 (PUT /api/cma/collect/settings) */
export function useSaveCollectSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: CollectSettingItem[]) =>
      api.put<unknown>("/api/cma/collect/settings", { settings }),
    onSuccess: () => {
      // CMA 홈 + 자산 스캔(총 잠자는 돈) 둘 다 갱신.
      // ACCOUNT 끝전 설정 저장 시 스캔 금액(calcAccountAmount)이 바뀌므로
      // asset.scan을 무효화하지 않으면 RESULT 총액이 갱신되지 않는다.
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all });
    },
    retry: false,
  });
}
