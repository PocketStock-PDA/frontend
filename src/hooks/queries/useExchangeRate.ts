import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { ExchangeRate } from "@/types/domain/exchange";

export function useExchangeRate() {
  return useQuery({
    queryKey: queryKeys.exchange.rate,
    queryFn: () => api.get<ExchangeRate>("/api/exchange/rate"),
    staleTime: 30_000,
  });
}
