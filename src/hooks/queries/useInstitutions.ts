import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { Institution } from "@/types/domain/asset";

/** 연동 가능 기관 목록 (GET /api/assets/institutions) — 마이데이터 연동 선택용 */
export function useInstitutions() {
  return useQuery({
    queryKey: queryKeys.asset.institutions,
    queryFn: () => api.get<Institution[]>("/api/assets/institutions"),
  });
}
