import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { Holding } from "@/types/domain/trading";

/** 보유종목 조회 (GET /api/trading/holdings) */
export function useHoldings() {
  return useQuery({
    queryKey: queryKeys.trading.holdings,
    queryFn: () => api.get<Holding[]>("/api/trading/holdings"),
  });
}
