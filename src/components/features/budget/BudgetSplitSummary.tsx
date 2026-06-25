"use client";

import { TriangleAlert, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKRW } from "@/lib/utils/currency";
import type { useBudgetSavings } from "@/hooks/queries/useBudget";
import type { useTransferAccount } from "@/hooks/queries/useTransferAccount";

// 조각 세그먼트 미터: 예산 한 줄을 20조각으로 나눠 쓴 돈(파랑)·아낀 돈→CMA(초록)으로 분배.
// 가계부 메인과 월 상세 페이지가 공유한다.
export function BudgetSplitSummary({
  spent,
  budget,
  usedPct,
  savingsQ,
  transferAccountQ,
  monthLabel,
  budgetLabel = "이번 달 예산",
  savingsApplicable = true,
  compact = false,
  onMonthDetail,
  onStartSaving,
  onManageTransfer,
}: {
  spent: number;
  budget: number;
  usedPct: number;
  savingsQ: ReturnType<typeof useBudgetSavings>;
  transferAccountQ: ReturnType<typeof useTransferAccount>;
  monthLabel: string;
  budgetLabel?: string;
  /** 절약금(아낀 돈/CMA) 표시 적용 여부. 과거 달 등에서는 false */
  savingsApplicable?: boolean;
  /** 컴팩트 모드: 라벨을 한 줄로 압축해 세로폭을 줄임 (가계부 메인용) */
  compact?: boolean;
  /** 제공되면 미터 영역이 버튼이 되어 탭 시 호출 */
  onMonthDetail?: () => void;
  /** 제공되고 미설정 상태면 "저금 시작" 유도 노출 */
  onStartSaving?: () => void;
  /** 제공되고 이체계좌 미설정이면 경고 노출 */
  onManageTransfer?: () => void;
}) {
  const loading = savingsQ.isLoading || transferAccountQ.isLoading;
  const agreed = savingsApplicable && !!savingsQ.data?.isCollectAgreed;
  const isOver = budget > 0 && spent > budget;
  const spentPct = Math.min(100, usedPct);
  const restPct = Math.max(0, 100 - spentPct);
  const savedAmount = agreed
    ? (savingsQ.data?.savedAmount ?? 0)
    : Math.max(0, budget - spent);
  const noAccount = agreed && !transferAccountQ.data;

  const meterBody = (
    <>
      {/* 헤더: 예산 총액 */}
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-foreground">{budgetLabel}</span>
        <span className="font-numeric text-sm font-bold text-foreground">
          {formatKRW(budget)}
        </span>
      </div>

      {/* 연속 2색 바: 쓴 돈(파랑) | 아낀 돈(초록), 분할점에 흰 틈 1개 */}
      {loading ? (
        <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-muted" />
      ) : (
        <div
          className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${spentPct}%` }}
          />
          {!isOver && agreed && (
            <>
              <div className="h-full w-[2px] shrink-0 bg-background" />
              <div className="h-full flex-1 bg-[#38BDF8]" />
            </>
          )}
        </div>
      )}

      {/* 컴팩트: 라벨 한 줄 (가계부 메인용) */}
      {!loading && compact && (
        <div className="mt-2.5 flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-primary" />
            <span className="text-muted-foreground">쓴 돈</span>
            <span className="font-numeric font-bold text-primary">{formatKRW(spent)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            {isOver ? (
              <>
                <span className="font-numeric font-bold text-[#F04452]">
                  +{formatKRW(spent - budget)}
                </span>
                <span className="text-muted-foreground">초과</span>
                <span className="size-2 rounded-[2px] bg-[#F04452]" />
              </>
            ) : agreed ? (
              <>
                <span className="text-muted-foreground">아낀 돈</span>
                <span className="font-numeric font-bold text-[#0369A1]">
                  {formatKRW(savedAmount)}
                </span>
                <span className="size-2 rounded-[2px] bg-[#38BDF8]" />
              </>
            ) : (
              <>
                <span className="text-muted-foreground">남은 예산</span>
                <span className="font-numeric font-bold text-foreground">
                  {formatKRW(savedAmount)}
                </span>
                <span className="size-2 rounded-[2px] bg-muted-foreground/40" />
              </>
            )}
          </span>
        </div>
      )}

      {/* 풀: 좌 쓴 돈 / 우 아낀 돈·남은 예산·초과 (월 상세용) — 마커는 미터와 같은 '조각' 모양 */}
      {!loading && !compact && (
        <div className="mt-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-primary" />
              <span className="text-[11px] text-muted-foreground">쓴 돈 · {spentPct}%</span>
            </div>
            <p className="font-numeric mt-1 text-[15px] font-bold text-primary">
              {formatKRW(spent)}
            </p>
          </div>

          <div className="text-right">
            {isOver ? (
              <>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[11px] text-muted-foreground">예산 초과</span>
                  <span className="size-2.5 rounded-[3px] bg-[#F04452]" />
                </div>
                <p className="font-numeric mt-1 text-[15px] font-bold text-[#F04452]">
                  +{formatKRW(spent - budget)}
                </p>
              </>
            ) : agreed ? (
              <>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[11px] text-muted-foreground">아낀 돈 · {restPct}%</span>
                  <span className="size-2.5 rounded-[3px] bg-[#38BDF8]" />
                </div>
                <p className="font-numeric mt-1 text-[15px] font-bold text-[#0369A1]">
                  {formatKRW(savedAmount)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {monthLabel} 말일 CMA 이체
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[11px] text-muted-foreground">남은 예산 · {restPct}%</span>
                  <span className="size-2.5 rounded-[3px] bg-muted-foreground/40" />
                </div>
                <p className="font-numeric mt-1 text-[15px] font-bold text-foreground">
                  {formatKRW(savedAmount)}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-border",
        compact ? "p-3.5" : "p-4",
      )}
    >
      {onMonthDetail ? (
        <button
          type="button"
          onClick={onMonthDetail}
          className="w-full text-left"
          aria-label={`${budgetLabel} ${formatKRW(budget)} 중 ${formatKRW(spent)} 사용. 월 지출 내역 보기`}
        >
          {meterBody}
        </button>
      ) : (
        <div>{meterBody}</div>
      )}

      {/* 절약 미설정 → 시작 유도 */}
      {!loading && !agreed && savingsApplicable && onStartSaving && (
        <button
          type="button"
          onClick={onStartSaving}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-accent px-3.5 py-2.5 text-left"
        >
          <span className="text-[12px] font-medium text-foreground">
            남는 예산, 월말에 CMA로 자동 저금할까요?
          </span>
          <ChevronRight className="size-4 shrink-0 text-primary" />
        </button>
      )}

      {/* 이체계좌 미설정 경고 */}
      {!loading && noAccount && onManageTransfer && (
        <button
          type="button"
          onClick={onManageTransfer}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-left"
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
            <TriangleAlert className="size-3.5 shrink-0" />
            이체 계좌가 설정되지 않았어요
          </span>
          <ChevronRight className="size-4 shrink-0 text-amber-500" />
        </button>
      )}
    </div>
  );
}
