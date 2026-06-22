import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { AutoInvestSetting } from "@/types/domain/autoInvest";

/**
 * 자동모으기 설정 조회 (GET /api/trading/stocks/{code}/auto-invest).
 * ⚠️ 백엔드 미구현 — 문서 스펙 기준 선구현. 설정이 없으면 null 반환 가정.
 * 호출부는 결과가 없으면(에러 포함) 기본값으로 폼을 초기화한다.
 */
export function useAutoInvest(stockCode: string) {
  return useQuery({
    queryKey: queryKeys.trading.autoInvest(stockCode),
    queryFn: () =>
      api.get<AutoInvestSetting | null>(
        `/api/trading/stocks/${stockCode}/auto-invest`,
      ),
    enabled: !!stockCode,
    retry: false, // 미구현/없음일 때 폼 진입이 지연되지 않도록
  });
}
