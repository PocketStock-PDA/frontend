import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MaturityTriggerAccount } from "@/types/domain/asset";

/**
 * 만기 굴리기 대상 예적금 목록(미래 만기·임박 순) — 계좌 선택 화면용.
 * GET /api/recommendations/maturity/accounts
 */
export function useMaturityAccounts() {
  return useQuery({
    queryKey: queryKeys.asset.maturityAccounts,
    queryFn: () =>
      api.get<MaturityTriggerAccount[]>("/api/recommendations/maturity/accounts"),
  });
}
