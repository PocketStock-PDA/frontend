import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { StockDetail } from "@/types/domain/trading";

/** 여러 종목 상세를 병렬 조회 (GET /api/trading/stocks/{code} × N) */
export function useStockDetails(codes: string[]) {
  return useQueries({
    queries: codes.map((code) => ({
      queryKey: queryKeys.trading.stockDetail(code),
      queryFn: () => api.get<StockDetail>(`/api/trading/stocks/${code}`),
      enabled: !!code,
    })),
  });
}
