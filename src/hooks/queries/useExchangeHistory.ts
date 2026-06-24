import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { FxHistory } from "@/types/domain/exchange";

export function useExchangeHistory(page = 0, size = 5) {
  return useQuery({
    queryKey: queryKeys.exchange.history(page),
    queryFn: () =>
      api.get<FxHistory>("/api/exchange/history", {
        params: { page: String(page), size: String(size) },
      }),
  });
}
