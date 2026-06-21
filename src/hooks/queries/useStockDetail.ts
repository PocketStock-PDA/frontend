import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { StockDetail } from "@/types/domain/trading";

/** 종목 상세(이름·로고·현재가) 조회 (GET /api/trading/stocks/{code}) */
export function useStockDetail(stockCode: string) {
  return useQuery({
    queryKey: queryKeys.trading.stockDetail(stockCode),
    queryFn: () => api.get<StockDetail>(`/api/trading/stocks/${stockCode}`),
    enabled: !!stockCode,
  });
}
