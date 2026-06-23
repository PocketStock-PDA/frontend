import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MaturityRecommendationResponse } from "@/types/domain/asset";

export function useMaturityRecommendation() {
  return useQuery({
    queryKey: queryKeys.asset.maturity,
    queryFn: () => api.get<MaturityRecommendationResponse>("/api/recommendations/maturity"),
  });
}
