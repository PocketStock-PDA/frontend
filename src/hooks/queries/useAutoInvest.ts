import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import {
  AUTO_INVEST_API_READY,
  type AutoInvestSetting,
} from "@/types/domain/autoInvest";

/**
 * 자동모으기 설정 조회 (GET /api/trading/stocks/{code}/auto-invest).
 * ⚠️ 백엔드 미구현 — AUTO_INVEST_API_READY=false 동안은 null 반환(호출부가 기본값으로 폼 초기화).
 * 백엔드 완성되면 AUTO_INVEST_API_READY만 true로 → 실제 GET 호출.
 */
export function useAutoInvest(stockCode: string) {
  return useQuery({
    queryKey: queryKeys.trading.autoInvest(stockCode),
    queryFn: () =>
      AUTO_INVEST_API_READY
        ? api.get<AutoInvestSetting | null>(
            `/api/trading/stocks/${stockCode}/auto-invest`,
          )
        : // 스텁: 저장된 설정 없음(기본값 사용) — 미구현 엔드포인트 호출 회피
          Promise.resolve<AutoInvestSetting | null>(null),
    enabled: !!stockCode,
    retry: false, // 미구현/없음일 때 폼 진입이 지연되지 않도록
  });
}

/**
 * 여러 종목 자동모으기 설정 병렬 조회 (모으기 관리 화면용).
 * 스텁(AUTO_INVEST_API_READY=false) 동안은 모두 null → "모으기 안 함"으로 표시된다.
 */
export function useAutoInvestList(codes: string[]) {
  return useQueries({
    queries: codes.map((code) => ({
      queryKey: queryKeys.trading.autoInvest(code),
      queryFn: () =>
        AUTO_INVEST_API_READY
          ? api.get<AutoInvestSetting | null>(
              `/api/trading/stocks/${code}/auto-invest`,
            )
          : Promise.resolve<AutoInvestSetting | null>(null),
      enabled: !!code,
      retry: false,
    })),
  });
}
