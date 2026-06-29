import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DepositRollover } from "@/types/domain/deposit";

/** '예금 재예치' 기록 — 전환내역에서 배당주 예약과 계좌ID로 병합. */
export function useDepositRollovers() {
  return useQuery({
    queryKey: queryKeys.deposit.rollovers,
    queryFn: () =>
      api.get<DepositRollover[]>("/api/recommendations/maturity/deposit-rollovers"),
  });
}
