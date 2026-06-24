import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { FxAutoSetting } from "@/types/domain/exchange";

interface AutoSettingRequest {
  autoEnabled: boolean;
  useDollarFirst: boolean;
  maxAmountPerTx: number | null;
  residualHandling: string | null;
}

export function useUpdateAutoSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AutoSettingRequest) =>
      api.put<FxAutoSetting>("/api/exchange/auto-settings", data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.exchange.autoSettings, data);
    },
  });
}
