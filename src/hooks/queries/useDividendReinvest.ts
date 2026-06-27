import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DividendReinvestSetting } from "@/types/domain/trading";

/** 배당 자동 재투자(DRIP) 설정 목록 — 종목별 ON/OFF (GET /api/trading/dividend-reinvest) */
export function useDividendReinvest() {
  return useQuery({
    queryKey: queryKeys.trading.dividendReinvest,
    queryFn: () =>
      api.get<DividendReinvestSetting[]>("/api/trading/dividend-reinvest"),
  });
}
