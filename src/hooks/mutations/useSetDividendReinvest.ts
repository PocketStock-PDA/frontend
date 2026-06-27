import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type {
  DividendReinvestRequest,
  DividendReinvestSetting,
} from "@/types/domain/trading";

/**
 * 배당 자동 재투자(DRIP) 토글 ON/OFF (PUT /api/trading/dividend-reinvest).
 * 토글은 즉각 반응이 중요해 낙관적 업데이트 — 실패 시 롤백한다.
 */
export function useSetDividendReinvest() {
  const qc = useQueryClient();
  const key = queryKeys.trading.dividendReinvest;

  return useMutation({
    mutationFn: (req: DividendReinvestRequest) =>
      api.put<DividendReinvestSetting>("/api/trading/dividend-reinvest", req),

    onMutate: async (req) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DividendReinvestSetting[]>(key);
      qc.setQueryData<DividendReinvestSetting[]>(key, (cur) =>
        cur?.map((s) =>
          s.stockCode === req.stockCode ? { ...s, enabled: req.enabled } : s,
        ),
      );
      return { prev };
    },

    onError: (_err, _req, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}
