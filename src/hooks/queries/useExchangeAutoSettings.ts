import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { FxAutoSetting } from "@/types/domain/exchange";

export function useExchangeAutoSettings() {
  return useQuery({
    queryKey: queryKeys.exchange.autoSettings,
    queryFn: () => api.get<FxAutoSetting>("/api/exchange/auto-settings"),
  });
}
