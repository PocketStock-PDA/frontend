import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DailyValuation } from "@/types/domain/trading";

/**
 * 일별 평가·수익률 추이 (GET /api/trading/valuations/{stockCode}).
 * 종가 스냅샷(BATCH-002) — 차트/스파크라인용. 환차손익 제외.
 */
export function useValuations(stockCode: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.trading.valuations(stockCode),
    queryFn: () =>
      api.get<DailyValuation[]>(`/api/trading/valuations/${stockCode}`),
    enabled: enabled && stockCode.length > 0,
  });
}
