import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { AssetSummaryResponse } from "@/types/domain/asset";

export function useAssetSummary() {
  return useQuery({
    queryKey: queryKeys.asset.summary,
    queryFn: () => api.get<AssetSummaryResponse>("/api/assets/summary"),
  });
}
