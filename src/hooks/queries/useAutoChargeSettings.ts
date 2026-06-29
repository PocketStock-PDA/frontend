import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

export interface AutoChargeSettings {
  enabled: boolean;
  sourceAccountId: number;
  maxChargePerTx: number;
}

export function useAutoChargeSettings() {
  return useQuery({
    queryKey: queryKeys.cma.autoChargeSettings,
    queryFn: () => api.get<AutoChargeSettings>("/api/cma/auto-charge-settings"),
  });
}

export function useUpdateAutoChargeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AutoChargeSettings>) =>
      api.put<void>("/api/cma/auto-charge-settings", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.autoChargeSettings });
    },
  });
}
