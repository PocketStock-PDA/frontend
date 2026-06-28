import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MaturityRecommendationResponse } from "@/types/domain/asset";

/**
 * 만기 도래 배당주 추천 — accountId 지정 시 그 예적금 기준, 없으면 가장 가까운 만기 자동 선택.
 */
export function useMaturityRecommendation(accountId?: number | null) {
  return useQuery({
    queryKey: queryKeys.asset.maturity(accountId),
    queryFn: () =>
      api.get<MaturityRecommendationResponse>(
        accountId != null
          ? `/api/recommendations/maturity?accountId=${accountId}`
          : "/api/recommendations/maturity",
      ),
  });
}
