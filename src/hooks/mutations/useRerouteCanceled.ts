import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

export interface RerouteCanceledRequest {
  linkedBankAccountId: number;
  amount: number;
  /** 활성 rollover가 없을 때 새로 만들 행선지. 있으면 무시되고 그 금액에 합산된다. */
  target?: "CMA" | "DEPOSIT" | null;
}

/**
 * 배당주 예약 취소분을 '남은 자금 굴리기'로 라우팅 (POST /api/recommendations/maturity/canceled-reroute).
 * 계좌에 활성 rollover(재예치/CMA)가 있으면 그 금액에 합산, 없으면 target으로 새로 생성 — 취소분 공중분해 방지.
 */
export function useRerouteCanceled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RerouteCanceledRequest) =>
      api.post<void>("/api/recommendations/maturity/canceled-reroute", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposit.rollovers });
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.maturityReservations });
    },
    retry: false,
  });
}
