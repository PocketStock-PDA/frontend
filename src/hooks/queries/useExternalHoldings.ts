import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { ExternalHolding } from "@/types/domain/asset";

export function useExternalHoldings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.asset.externalHoldings,
    queryFn: () => api.get<ExternalHolding[]>("/api/assets/external-holdings"),
    enabled,
  });
}
