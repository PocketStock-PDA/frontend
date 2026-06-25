"use client";

import { use, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import {
  useBudgetGoals,
  useBudgetCalendar,
  useBudgetSavings,
} from "@/hooks/queries/useBudget";
import { useTransferAccount } from "@/hooks/queries/useTransferAccount";
import { useSetManualGoals } from "@/hooks/mutations/useSetManualGoals";
import { formatKRW, parseAmount } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "../../_utils/categoryIcon";
import { BudgetSplitSummary } from "@/components/features/budget/BudgetSplitSummary";
import type { BudgetGoalCategoryItem } from "@/types/domain/budget";

interface Props {
  params: Promise<{ year: string; month: string }>;
}

export default function BudgetMonthPage({ params }: Props) {
  const router = useRouter();
  const { year: yearStr, month: monthStr } = use(params);
  const year = Number(yearStr);
  const month = Number(monthStr);

  const goalsQ = useBudgetGoals();
  const calendarQ = useBudgetCalendar(year, month);
  const savingsQ = useBudgetSavings();
  const transferAccountQ = useTransferAccount();

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;

  const title =
    year === now.getFullYear()
      ? format(new Date(year, month - 1, 1), "M월 지출")
      : format(new Date(year, month - 1, 1), "yyyy년 M월 지출");

  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarDailyBudget = calendarQ.data?.dailyBudget ?? 0;
  const calendarSpent =
    calendarQ.data?.days.reduce((s, d) => s + Number(d.spent), 0) ?? 0;
  const monthlyBudget = isCurrentMonth
    ? (goalsQ.data?.monthlyBudget ?? 0)
    : calendarDailyBudget > 0
      ? calendarDailyBudget * daysInMonth
      : (goalsQ.data?.monthlyBudget ?? 0);
  const spentAmount = isCurrentMonth
    ? (goalsQ.data?.spentAmount ?? calendarSpent)
    : calendarSpent;
  const usedPct =
    monthlyBudget > 0
      ? Math.min(100, Math.round((spentAmount / monthlyBudget) * 100))
      : 0;

  const isLoading = goalsQ.isLoading || calendarQ.isLoading;
  const isError = goalsQ.isError;
  const setGoals = useSetManualGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [budgets, setBudgets] = useState<Record<string, string>>({});

  const startEditing = () => {
    setBudgets(
      Object.fromEntries(
        (goalsQ.data?.categories ?? []).map((c) => [c.category, String(c.budget)]),
      ),
    );
    setIsEditing(true);
  };

  const handleSave = () => {
    const parsed = (goalsQ.data?.categories ?? []).map((c) => {
      const raw = budgets[c.category]?.trim();
      // 빈 입력은 기존 목표 예산을 유지(0원으로 덮어쓰기 방지)
      return {
        category: c.category,
        budget: raw ? parseAmount(raw) : c.budget,
      };
    });
    setGoals.mutate(parsed, { onSuccess: () => setIsEditing(false) });
  };

  return (
    <>
      <AppHeader variant="sub" title={title} />
      {isLoading ? (
        <div className="mt-4 space-y-4">
          <SkeletonCard lines={2} className="h-28" />
          <SkeletonCard lines={4} className="h-44" />
        </div>
      ) : isError || !goalsQ.data ? (
        <EmptyState title="불러오지 못했어요" className="mt-8" />
      ) : (
        <div className="space-y-5 py-4">
          {/* 월 예산 분배: 쓴 돈 · 아낀 돈(→CMA) — 가계부 메인과 동일한 조각 미터 */}
          <BudgetSplitSummary
            spent={spentAmount}
            budget={monthlyBudget}
            usedPct={usedPct}
            savingsQ={savingsQ}
            transferAccountQ={transferAccountQ}
            monthLabel={format(new Date(year, month - 1, 1), "M월")}
            budgetLabel={`${format(new Date(year, month - 1, 1), "M월")} 예산`}
            savingsApplicable={isCurrentMonth}
            onManageTransfer={() => router.push("/my/savings-transfer")}
          />

          {/* 카테고리별 지출 */}
          <section>
            <div className="flex items-center justify-between pb-3">
              <p className="text-sm font-semibold text-foreground">
                카테고리별 지출
              </p>
              {isCurrentMonth && (
                isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-muted-foreground"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={setGoals.isPending}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {setGoals.isPending ? "저장 중" : "저장"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    목표 설정
                  </button>
                )
              )}
            </div>
            <div className="space-y-[10px]">
              {goalsQ.data.categories.map((cat) => (
                <CategoryGoalRow
                  key={cat.category}
                  {...cat}
                  isEditing={isEditing}
                  editValue={budgets[cat.category] ?? ""}
                  onEditChange={(raw) =>
                    setBudgets((prev) => ({ ...prev, [cat.category]: raw }))
                  }
                />
              ))}
            </div>
          </section>

          {/* 카드 추천: 티저 섹션 */}
          <section>
            <p className="text-lg font-bold text-foreground">
              내 소비에 딱 맞는 카드를 찾았어요
            </p>
            <div className="mt-4 flex justify-center">
              <div className="flex h-[120px] w-[88px] items-center justify-center rounded-2xl bg-muted">
                <span className="text-3xl font-bold text-muted-foreground/40">?</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/recommendations/cards")}
              className="mt-4 w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-primary"
            >
              많이 쓴 곳에서 할인받기
            </button>
          </section>
        </div>
      )}

    </>
  );
}

function CategoryGoalRow({
  category,
  budget,
  spent,
  isEditing = false,
  editValue = "",
  onEditChange,
}: {
  category: string;
  budget: number;
  spent: number;
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (raw: string) => void;
}) {
  const pct =
    budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const hasSpending = spent > 0;
  const isOver = budget > 0 && spent > budget;
  const Icon = getCategoryIcon(category);

  return (
    <div className="space-y-[5px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-full",
              hasSpending ? "bg-accent" : "bg-muted",
            )}
          >
            <Icon
              className={cn(
                "size-[14px]",
                hasSpending ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              hasSpending ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {category}
          </span>
          {isOver && (
            <span className="rounded-full bg-[#FDECEC] px-1.5 py-px text-[10px] font-medium text-[#F04452]">
              초과
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              isOver
                ? "text-[#F04452]"
                : hasSpending
                  ? "text-foreground"
                  : "text-muted-foreground",
            )}
          >
            {formatKRW(spent)}
          </span>
          <span className="text-[11px] text-muted-foreground">/</span>
          {isEditing ? (
            <input
              inputMode="numeric"
              value={editValue}
              onChange={(e) => onEditChange?.(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-20 border-b border-primary bg-transparent text-right text-[11px] font-semibold text-foreground outline-none"
            />
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {formatKRW(budget)}
            </span>
          )}
        </div>
      </div>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            isOver ? "bg-[#F04452]" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
