import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import {
  AUTO_INVEST_API_READY,
  type AutoInvestSetting,
  type SaveAutoInvestRequest,
} from "@/types/domain/autoInvest";

/**
 * 자동모으기 설정 저장 (PUT /api/trading/stocks/{code}/auto-invest).
 * ⚠️ 백엔드 미구현 — AUTO_INVEST_API_READY=false 동안은 실제 저장하지 않고 입력값을 그대로 반환(스텁).
 * 백엔드 완성되면 AUTO_INVEST_API_READY만 true로 → 실제 PUT 호출(이 함수 외 변경 불필요).
 */
export function useSaveAutoInvest(stockCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SaveAutoInvestRequest) => {
      if (AUTO_INVEST_API_READY) {
        return api.put<AutoInvestSetting>(
          `/api/trading/stocks/${stockCode}/auto-invest`,
          req,
        );
      }
      // 스텁: 미구현 엔드포인트 호출 회피. 저장된 것처럼 입력값 반환(실제 영속화 X)
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[useSaveAutoInvest] 백엔드 미구현 — 저장 스텁. AUTO_INVEST_API_READY로 연결",
        );
      }
      return Promise.resolve<AutoInvestSetting>({ stockCode, ...req });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.trading.autoInvest(stockCode),
      }),
  });
}

/** 모으기 관리 화면용 — 여러 종목 enabled 등 일괄 저장. 스텁 동안은 영속화 X. */
export function useSaveAutoInvestList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      items: { stockCode: string; setting: SaveAutoInvestRequest }[],
    ) => {
      if (!AUTO_INVEST_API_READY) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[useSaveAutoInvestList] 백엔드 미구현 — 저장 스텁. AUTO_INVEST_API_READY로 연결",
          );
        }
        return;
      }
      await Promise.all(
        items.map((it) =>
          api.put<AutoInvestSetting>(
            `/api/trading/stocks/${it.stockCode}/auto-invest`,
            it.setting,
          ),
        ),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.all }),
  });
}
