import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import {
  stockToSetting,
  type AutoInvestExecution,
  type AutoInvestSetting,
  type AutoInvestSummary,
  type AutoInvestTrigger,
} from "@/types/domain/autoInvest";

/**
 * 자동모으기 종합 설정 조회 (GET /api/trading/auto-invest).
 * 전역 enabled/paused + 종목별 stocks[]를 한 번에 반환. 종목별 화면은 여기서 code→id를 해석한다.
 */
export function useAutoInvestSummary() {
  return useQuery({
    queryKey: queryKeys.trading.autoInvestSummary,
    queryFn: () => api.get<AutoInvestSummary>("/api/trading/auto-invest"),
  });
}

/**
 * 실제 "모으는 중" 종목 수. 전역 미사용/일시중지(적립 유지 아님)면 0.
 */
export function countActiveAutoInvest(
  summary: AutoInvestSummary | null | undefined,
): number {
  if (!summary || !summary.enabled) return 0;
  if (summary.paused && !summary.keepCollectingOnPause) return 0;
  return summary.stocks.filter((s) => s.isActive).length;
}

/** 종목 1건의 트리거(물타기/익절) 조회 (GET /auto-invest/{id}/triggers). id 없으면 비활성. */
export function useAutoInvestTriggers(id: number | null) {
  return useQuery({
    queryKey: queryKeys.trading.autoInvestTriggers(id ?? 0),
    queryFn: () =>
      api.get<AutoInvestTrigger[]>(`/api/trading/auto-invest/${id}/triggers`),
    enabled: id !== null,
  });
}

/** 종목 1건의 모으기 회차 내역 (GET /auto-invest/{id}/executions). id 없으면 비활성. */
export function useAutoInvestExecutions(id: number | null) {
  return useQuery({
    queryKey: queryKeys.trading.autoInvestExecutions(id ?? 0),
    queryFn: () =>
      api.get<AutoInvestExecution[]>(
        `/api/trading/auto-invest/${id}/executions`,
      ),
    enabled: id !== null,
  });
}

export interface AutoInvestForStock {
  /** 폼 초기값(미등록이면 null → 호출부가 defaultSetting 사용) */
  setting: AutoInvestSetting | null;
  /** 등록된 설정 id (미등록이면 null) */
  id: number | null;
  /** 기존 BUY 트리거 id (없으면 null) — 저장 시 삭제 판단용 */
  buyTriggerId: number | null;
  sellTriggerId: number | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * 종목별 자동모으기 — 종합조회에서 code→설정을 찾고, 있으면 트리거까지 합쳐 폼 뷰모델로 반환.
 * (백엔드는 stockCode가 아닌 id 키 → 종합조회로 해석. 미등록 종목은 setting=null.)
 */
export function useAutoInvest(stockCode: string): AutoInvestForStock {
  const summaryQ = useAutoInvestSummary();
  const stock =
    summaryQ.data?.stocks.find((s) => s.stockCode === stockCode) ?? null;
  const id = stock?.id ?? null;
  const triggersQ = useAutoInvestTriggers(id);
  const triggers = triggersQ.data ?? [];

  return {
    setting: stock ? stockToSetting(stock, triggers) : null,
    id,
    buyTriggerId: triggers.find((t) => t.triggerKind === "BUY")?.id ?? null,
    sellTriggerId: triggers.find((t) => t.triggerKind === "SELL")?.id ?? null,
    isLoading: summaryQ.isLoading || (id !== null && triggersQ.isLoading),
    isError: summaryQ.isError || triggersQ.isError,
    refetch: () => {
      summaryQ.refetch();
      if (id !== null) triggersQ.refetch();
    },
  };
}
