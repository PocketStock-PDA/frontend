import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MyPageSettings, MyProfile } from "@/types/domain/myPage";

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
    onSuccess: async (_data, settings) => {
      // 마이페이지 "카드 잔돈 모으기" 토글(별도 저장소 /api/users/me/mypage)은 CARD
      // 수집설정에서 자동 파생되지 않으므로, CARD 설정이 포함된 저장이면 토글 플래그를
      // CARD enabled 여부로 직접 동기화한다. (홈 CardLinkSheet·card-collect 페이지는
      // 항상 대상 카드 전체를 보내므로 이 페이로드만으로 활성 여부를 판단할 수 있다.)
      const cardItems = settings.filter((s) => s.sourceType === "CARD");
      if (cardItems.length > 0) {
        try {
          const updated = await api.patch<MyPageSettings>(
            "/api/users/me/mypage/settings",
            { cardChangeCollect: cardItems.some((s) => s.enabled) },
          );
          queryClient.setQueryData<MyProfile>(queryKeys.user.profile, (prev) =>
            prev ? { ...prev, settings: updated } : prev,
          );
        } catch {
          // 토글 동기화 실패는 치명적이지 않음 — invalidate 로 최종 정합성 회복 시도.
          queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
      }
      // CMA 홈 + 자산 스캔(총 잠자는 돈) 둘 다 갱신.
      // ACCOUNT 끝전 설정 저장 시 스캔 금액(calcAccountAmount)이 바뀌므로
      // asset.scan을 무효화하지 않으면 RESULT 총액이 갱신되지 않는다.
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all });
    },
    retry: false,
  });
}
