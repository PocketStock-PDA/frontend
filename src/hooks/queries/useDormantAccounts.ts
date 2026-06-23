import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DormantAccount } from "@/types/domain/asset";

/** 휴면 계좌 조회 (GET /api/assets/dormant) — 잔돈 발견 결과의 '휴면계좌 발견' 카드용 */
export function useDormantAccounts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.asset.dormant,
    queryFn: () => api.get<DormantAccount[]>("/api/assets/dormant"),
    enabled,
  });
}
