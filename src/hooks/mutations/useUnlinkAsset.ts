import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { InstitutionCategory } from "@/types/domain/asset";

// 카테고리 → 백엔드 해제 경로(DELETE /api/assets/links/{path}/{companyCode}).
const CATEGORY_PATH: Record<InstitutionCategory, string> = {
  BANK: "bank",
  SECURITIES: "securities",
  CARD: "card",
  POINT: "point",
};

export interface UnlinkAssetParams {
  category: InstitutionCategory;
  companyCode: string;
}

/**
 * 기관 연동 해제 — 전 카테고리 공용.
 * 해제 후 기관 목록·스캔·잔액(자산·CMA) 캐시 갱신.
 */
export function useUnlinkAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, companyCode }: UnlinkAssetParams) =>
      api.delete<void>(
        `/api/assets/links/${CATEGORY_PATH[category]}/${companyCode}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
      // 마이페이지 연동기관 목록·카드 토글 파생값 갱신
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    },
    retry: false,
  });
}
