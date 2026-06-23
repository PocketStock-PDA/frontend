import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { BankAccount } from "@/types/domain/account";

/** 보유 은행 계좌 목록 (GET /api/assets/bank-accounts) — 1원 인증/소액 이체 대상 선택용 */
export function useBankAccounts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.asset.bankAccounts,
    queryFn: () => api.get<BankAccount[]>("/api/assets/bank-accounts"),
    enabled,
  });
}
