import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { LinkedCard } from "@/types/domain/account";

/** 연동 카드 목록 (GET /api/assets/cards) — 잔돈 모으기 카드 선택용 */
export function useLinkedCards(enabled = true) {
  return useQuery({
    queryKey: queryKeys.asset.cards,
    queryFn: () => api.get<LinkedCard[]>("/api/assets/cards"),
    enabled,
  });
}
