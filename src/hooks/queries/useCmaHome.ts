import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CmaHome } from "@/types/domain/cma";

/** CMA 계좌 미개설(신규 회원) 신호 — /api/cma/home이 404를 반환. */
export function isNoCmaAccount(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** CMA 홈 대시보드 조회 (GET /api/cma/home) */
export function useCmaHome() {
  return useQuery({
    queryKey: queryKeys.cma.home,
    queryFn: () => api.get<CmaHome>("/api/cma/home"),
    // 계좌 미개설(404)은 확정 상태 — 재시도하지 않고 바로 계좌개설로 보낸다.
    retry: (failureCount, error) =>
      !isNoCmaAccount(error) && failureCount < 1,
  });
}
