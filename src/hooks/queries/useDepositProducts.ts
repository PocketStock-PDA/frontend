import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { DepositProduct } from "@/types/domain/deposit";

/** 예적금 상품 추천 목록(최고금리 순) — '예금 재예치' 화면용. */
export function useDepositProducts() {
  return useQuery({
    queryKey: queryKeys.deposit.products,
    queryFn: () => api.get<DepositProduct[]>("/api/recommendations/deposits"),
    staleTime: 5 * 60_000,
  });
}
