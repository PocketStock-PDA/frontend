import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type {
  WelcomeReward,
  WelcomeRewardClaimRequest,
} from "@/types/domain/reward";

/**
 * 첫 주식(웰컴) 지급 — 후보 중 1종목 선택해 1,000원어치 소수점 지급 (POST /api/trading/rewards/welcome).
 * 1인 1회(서버에서 user_id UNIQUE). 성공 시 보유/잔액/리워드 캐시 무효화.
 */
export function useClaimWelcomeReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stockCode: string) =>
      api.post<WelcomeReward>("/api/trading/rewards/welcome", {
        stockCode,
      } satisfies WelcomeRewardClaimRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.rewards });
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.holdings });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
    },
    retry: false,
  });
}
