import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { PortfolioSummary } from "@/types/domain/trading";

/**
 * 포트폴리오 요약 조회 (GET /api/trading/portfolio/summary).
 * 전체/국내/해외 집계 + 종목별 평가·수익률을 서버 단일소스로 받는다(현재가 스냅샷·현재 환율 환산).
 */
export function usePortfolioSummary() {
  return useQuery({
    queryKey: queryKeys.trading.portfolioSummary,
    queryFn: () =>
      api.get<PortfolioSummary>("/api/trading/portfolio/summary"),
  });
}
