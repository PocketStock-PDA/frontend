import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
  buyConditionToTrigger,
  sellConditionToTrigger,
  settingToSaveRequest,
  type AutoInvestSetting,
  type AutoInvestStock,
} from "@/types/domain/autoInvest";

// 자동모으기 전체 키 프리픽스 — 종합조회·트리거·회차 캐시를 한 번에 무효화
const AUTO_INVEST_KEY = ["trading", "autoInvest"] as const;

const statusBody = (action: "PAUSE" | "RESUME") => ({ action });

/** 종목별 자동모으기 저장에 필요한 컨텍스트 (종합조회/트리거 조회에서 받아 넘긴다). */
export interface SaveAutoInvestVars {
  form: AutoInvestSetting;
  /** 기존 설정 id (미등록이면 null → POST 등록) */
  id: number | null;
  /** 기존 BUY/SELL 트리거 id (없으면 null → 조건 끄면 삭제 스킵) */
  buyTriggerId: number | null;
  sellTriggerId: number | null;
}

/**
 * 종목별 자동모으기 저장 — 백엔드 계약에 맞춰 여러 호출을 오케스트레이션한다.
 *  1) 설정: 미등록이면 POST 등록, 있으면 PUT 수정(+RESUME으로 활성 보장)
 *  2) 마스터 OFF: PATCH status=PAUSE (미등록이면 무시)
 *  3) 조건(물타기/익절): 켜져 있으면 POST 트리거 upsert, 꺼졌고 기존 있으면 DELETE
 */
export function useSaveAutoInvest(stockCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ form, id, buyTriggerId, sellTriggerId }: SaveAutoInvestVars) => {
      // 마스터 OFF — 등록돼 있으면 일시중지, 아니면 할 일 없음
      if (!form.enabled) {
        if (id !== null) {
          await api.patch<void>(
            `/api/trading/auto-invest/${id}/status`,
            statusBody("PAUSE"),
          );
        }
        return;
      }

      // 설정 upsert
      const body = settingToSaveRequest({ ...form, stockCode });
      let settingId = id;
      if (settingId === null) {
        const created = await api.post<AutoInvestStock>(
          "/api/trading/auto-invest",
          body,
        );
        settingId = created.id;
      } else {
        await api.put<AutoInvestStock>(
          `/api/trading/auto-invest/${settingId}`,
          body,
        );
        // 기존이 일시중지였을 수 있으니 활성 보장
        await api.patch<void>(
          `/api/trading/auto-invest/${settingId}/status`,
          statusBody("RESUME"),
        );
      }

      // 트리거 동기화 — POST는 종류별 upsert(종목당 BUY 1·SELL 1)
      if (form.buyCondition.enabled) {
        await api.post(
          `/api/trading/auto-invest/${settingId}/triggers`,
          buyConditionToTrigger(form.buyCondition),
        );
      } else if (buyTriggerId !== null) {
        await api.delete<void>(
          `/api/trading/auto-invest/${settingId}/triggers/${buyTriggerId}`,
        );
      }
      if (form.sellCondition.enabled) {
        await api.post(
          `/api/trading/auto-invest/${settingId}/triggers`,
          sellConditionToTrigger(form.sellCondition),
        );
      } else if (sellTriggerId !== null) {
        await api.delete<void>(
          `/api/trading/auto-invest/${settingId}/triggers/${sellTriggerId}`,
        );
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTO_INVEST_KEY }),
  });
}

/**
 * 자동모으기 완전 해제 (DELETE /api/trading/auto-invest/{id}).
 * 설정 + 트리거 + 회차로그까지 CASCADE 삭제(되돌릴 수 없음). 일시중지는 PATCH status로 별도.
 */
export function useRemoveAutoInvest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<void>(`/api/trading/auto-invest/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTO_INVEST_KEY }),
  });
}

/**
 * 모으기 관리 화면용 — 여러 종목 활성/중지 일괄 변경 (PATCH status).
 * 등록된(id 있는) 종목만 대상. 미등록 종목 신규 등록은 개별 설정 페이지에서.
 */
export function useSetAutoInvestStatusList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: number; active: boolean }[]) => {
      await Promise.all(
        items.map((it) =>
          api.patch<void>(
            `/api/trading/auto-invest/${it.id}/status`,
            statusBody(it.active ? "RESUME" : "PAUSE"),
          ),
        ),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTO_INVEST_KEY }),
  });
}
