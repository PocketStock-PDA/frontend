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
    queryFn: () =>
      api.get<CmaTransaction[]>("/api/cma/transactions", {
        params: { page: String(page), size: String(size) },
      }),
  });
}
