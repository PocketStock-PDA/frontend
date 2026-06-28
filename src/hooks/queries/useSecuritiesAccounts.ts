import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { SecuritiesAccountStatus } from "@/types/domain/account";

/** 증권 계좌 상태 조회 (GET /api/trading/accounts) */
export function useSecuritiesAccounts() {
  return useQuery({
    queryKey: queryKeys.trading.accounts,
    queryFn: () => api.get<SecuritiesAccountStatus[]>("/api/trading/accounts"),
  });
}
