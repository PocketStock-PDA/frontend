import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type {
  AutoInvestSetting,
  SaveAutoInvestRequest,
} from "@/types/domain/autoInvest";

/**
 * 자동모으기 설정 저장 (PUT /api/trading/stocks/{code}/auto-invest).
 * ⚠️ 백엔드 미구현 — 문서 스펙 기준 선구현. 성공 시 해당 종목 설정 캐시 무효화.
 */
export function useSaveAutoInvest(stockCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SaveAutoInvestRequest) =>
      api.put<AutoInvestSetting>(
        `/api/trading/stocks/${stockCode}/auto-invest`,
        req,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.trading.autoInvest(stockCode),
      }),
  });
}
