import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CmaTransaction } from "@/types/domain/cma";

/**
 * CMA 계좌내역 조회 (GET /api/cma/transactions).
 * 응답은 거래 배열(최신순). 유형/통화 분류는 클라에서 한다.
 */
export function useCmaTransactions(page = 0, size = 100) {
  return useQuery({
    queryKey: queryKeys.cma.transactions(page, size),
    // apiClient는 data=null이면 {}를 반환 → 배열로 정규화(소비측 .filter 크래시 방지)
    queryFn: async () => {
      const data = await api.get<CmaTransaction[]>("/api/cma/transactions", {
        params: { page: String(page), size: String(size) },
      });
      return Array.isArray(data) ? data : [];
    },
  });
}
