import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type {
  WelcomeReward,
  WelcomeRewardCandidate,
} from "@/types/domain/reward";

/**
 * 내가 받은 첫 주식 리워드 (GET /api/trading/rewards) — 구현됨.
 * 비어 있으면 아직 미수령(=이벤트 대상).
 */
export function useWelcomeRewards() {
  return useQuery({
    queryKey: queryKeys.trading.rewards,
    queryFn: () => api.get<WelcomeReward[]>("/api/trading/rewards"),
  });
}

/** 첫 주식 후보 종목 (GET /api/trading/rewards/welcome/candidates) — 구현됨. */
export function useWelcomeRewardCandidates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.trading.rewardCandidates,
    queryFn: () =>
      api.get<WelcomeRewardCandidate[]>(
        "/api/trading/rewards/welcome/candidates",
      ),
    enabled,
  });
}
