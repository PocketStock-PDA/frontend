import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CardRecommendationResponse } from "@/types/domain/asset";

export function useCardRecommendation() {
  return useQuery({
    queryKey: queryKeys.asset.cardRecommendation,
    queryFn: () => api.get<CardRecommendationResponse>("/api/recommendations/cards"),
  });
}
