import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CmaBalance } from "@/types/domain/cma";

/**
 * CMA 잔액·성과율 조회 (GET /api/cma/balance).
 * home(KRW 총액만)과 달리 원화풀/외화풀을 각각의 RP 연이율과 함께 반환한다.
 */
export function useCmaBalance() {
  return useQuery({
    queryKey: queryKeys.cma.balance,
    // apiClient는 data=null이면 {}를 반환 → 기본 shape로 정규화(accounts.find 등 크래시 방지)
    queryFn: async () => {
      const data = await api.get<CmaBalance>("/api/cma/balance");
      return {
        accounts: Array.isArray(data?.accounts) ? data.accounts : [],
        totalKrwEquivalent: data?.totalKrwEquivalent ?? 0,
      } satisfies CmaBalance;
    },
  });
}
