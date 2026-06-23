import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

/**
 * 선택 기관 일괄 연동 (POST /api/assets/links) — 마이데이터 온보딩.
 * 바디: { institutions: companyCode[] }. authToken은 mock이라 생략 가능.
 */
export function useLinkAssets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyCodes: string[]) =>
      api.post<unknown>("/api/assets/links", { institutions: companyCodes }),
    // 연동 후 기관 목록·스캔·잔액 등 자산 캐시 갱신
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.asset.all }),
    retry: false,
  });
}
