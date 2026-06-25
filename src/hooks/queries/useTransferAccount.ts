import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { TransferAccountInfo } from "@/types/domain/budget";

/** 절약금 이체 계좌 조회 (GET /api/budget/savings/transfer-account). 미등록 시 data: null */
export function useTransferAccount() {
  return useQuery({
    queryKey: queryKeys.budget.transferAccount,
    queryFn: () => api.get<TransferAccountInfo | null>("/api/budget/savings/transfer-account"),
  });
}
