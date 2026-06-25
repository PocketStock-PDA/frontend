"use client";

import { createElement, use, useState } from "react";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useBudgetGoals, useBudgetCalendar } from "@/hooks/queries/useBudget";
import { useSetManualGoals } from "@/hooks/mutations/useSetManualGoals";
import { formatKRW, parseAmount } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "../../_utils/categoryIcon";

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

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;

  const title = format(new Date(year, month - 1, 1), "yyyy년 M월 지출");

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
          {/* 월 지출 요약 */}
          <div className="rounded-2xl bg-accent px-4 py-[14px]">
            <p className="text-xs font-medium text-muted-foreground">
              {format(new Date(year, month - 1, 1), "M월")} 지출
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-numeric text-[22px] font-bold text-primary">
                {formatKRW(spentAmount)}
              </span>
              <span className="font-numeric text-xs text-muted-foreground">
                / {formatKRW(monthlyBudget)}
              </span>
            </div>
            <div className="mt-3 h-[7px] w-full overflow-hidden rounded-full bg-[#C8DFF8]">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px]">
              <span className="text-muted-foreground">{usedPct}% 사용</span>
              <span className="text-primary">
                남은 예산 {formatKRW(monthlyBudget - spentAmount)}
              </span>
            </div>
          </div>

          {/* 카테고리별 지출 */}
          <section>
            <div className="flex items-center justify-between pb-3">
              <p className="text-xs font-medium text-muted-foreground">
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

          {/* 카드 추천 */}
          <div className="-mx-5 h-2 bg-muted" />
          <section>
            <p className="pb-3 text-xs font-medium text-muted-foreground">
              카드 추천
            </p>
            <button
              type="button"
              onClick={() => router.push("/recommendations/cards")}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-accent px-4 py-[14px] text-left"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  소비 패턴 맞춤 카드 추천
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  내 소비 기준 가장 혜택이 큰 카드를 추천해 드려요
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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
  const iconClassName = cn(
    "size-[14px]",
    hasSpending ? "text-primary" : "text-[#AAAAAA]",
  );

  return (
    <div className="space-y-[5px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              hasSpending ? "bg-accent" : "bg-muted",
            )}
          >
            {createElement(getCategoryIcon(category), { className: iconClassName })}
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              hasSpending ? "text-foreground" : "text-[#AAAAAA]",
            )}
          >
            {category}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              hasSpending ? "text-foreground" : "text-[#AAAAAA]",
            )}
          >
            {formatKRW(spent)}
          </span>
          <span className={cn("text-[11px]", hasSpending ? "text-[#888888]" : "text-[#AAAAAA]")}>
            /
          </span>
          {isEditing ? (
            <input
              inputMode="numeric"
              value={editValue}
              onChange={(e) => onEditChange?.(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-20 border-b border-primary bg-transparent text-right text-[11px] font-semibold text-foreground outline-none"
            />
          ) : (
            <span className={cn("text-[11px]", hasSpending ? "text-[#888888]" : "text-[#AAAAAA]")}>
              {formatKRW(budget)}
            </span>
          )}
        </div>
      </div>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            hasSpending ? "bg-primary" : "bg-[#E8E8E8]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
