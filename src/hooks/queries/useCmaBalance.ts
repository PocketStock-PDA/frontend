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
    queryFn: () => api.get<CmaBalance>("/api/cma/balance"),
  });
}
