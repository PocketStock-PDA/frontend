import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { CmaHome } from "@/types/domain/cma";

/** CMA 홈 대시보드 조회 (GET /api/cma/home) */
export function useCmaHome() {
  return useQuery({
    queryKey: queryKeys.cma.home,
    queryFn: () => api.get<CmaHome>("/api/cma/home"),
  });
}
