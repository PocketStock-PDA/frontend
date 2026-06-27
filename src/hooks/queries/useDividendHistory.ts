import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DividendPayout } from "@/types/domain/trading";

/** 배당 지급/재투자 내역 (GET /api/trading/dividend-reinvest/history) */
export function useDividendHistory() {
  return useQuery({
    queryKey: queryKeys.trading.dividendHistory,
    queryFn: () =>
      api.get<DividendPayout[]>("/api/trading/dividend-reinvest/history"),
  });
}
