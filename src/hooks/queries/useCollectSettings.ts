import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CollectSettingItem } from "@/hooks/mutations/useSaveCollectSettings";

/** 잔돈 모으기 수집 소스 설정 조회 (GET /api/cma/collect/settings) */
export function useCollectSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cma.collectSettings,
    queryFn: () => api.get<CollectSettingItem[]>("/api/cma/collect/settings"),
    enabled,
  });
}
