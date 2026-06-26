"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CreditCard, CheckCircle2, Check } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useBudgetGoals,
  useBudgetCalendar,
  useBudgetSavings,
} from "@/hooks/queries/useBudget";
import { useTransferAccount } from "@/hooks/queries/useTransferAccount";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useSetManualGoals } from "@/hooks/mutations/useSetManualGoals";
import { useSetTransferAccount } from "@/hooks/mutations/useSetTransferAccount";
import { useAgreeCollect } from "@/hooks/mutations/useAgreeCollect";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import { formatKRW, parseAmount } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { SpendingResponse } from "@/types/domain/asset";

export default function BudgetMonthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = new Date();
  const yearParam = Number(searchParams.get("year"));
  const monthParam = Number(searchParams.get("month"));
  const year =
    Number.isInteger(yearParam) && yearParam > 0
      ? yearParam
      : current.getFullYear();
  const month =
    Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : current.getMonth() + 1;

  const goalsQ = useBudgetGoals();
  const calendarQ = useBudgetCalendar(year, month);
  const savingsQ = useBudgetSavings();
  const transferAccountQ = useTransferAccount();
  const bankAccountsQ = useBankAccounts();
  const setTransferAccount = useSetTransferAccount();
  const agreeCollect = useAgreeCollect();

  const now = current;
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;

  const monthLabel = format(new Date(year, month - 1, 1), "M월");
  const title =
    year === now.getFullYear()
      ? `${monthLabel} 지출`
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
  const isOverBudget = monthlyBudget > 0 && spentAmount > monthlyBudget;

  const agreed = isCurrentMonth && !!savingsQ.data?.isCollectAgreed;
  const noAccount = agreed && !transferAccountQ.data;
  const remaining = Math.max(0, monthlyBudget - spentAmount);
  // 절약금: 저금 설정 시 실제 아낀 돈(→CMA), 미설정이면 남은 예산
  const savedAmount = agreed ? (savingsQ.data?.savedAmount ?? 0) : remaining;

  const isLoading = goalsQ.isLoading || calendarQ.isLoading;
  const isError = goalsQ.isError;
  const setGoals = useSetManualGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showSetupSheet, setShowSetupSheet] = useState(false);
  const [setupAccountId, setSetupAccountId] = useState<number | null>(null);
  const [agreeChecked, setAgreeChecked] = useState(false);

  // 지난달 카테고리별 지출 — 목표 설정 시 참고용 (편집 중에만 로드)
  const prevDate = new Date(year, month - 2, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;
  const prevSpendingQ = useQuery({
    queryKey: queryKeys.asset.spending({ year: prevYear, month: prevMonth }),
    queryFn: () =>
      api.get<SpendingResponse>("/api/assets/spending", {
        params: { year: String(prevYear), month: String(prevMonth) },
      }),
    enabled: isEditing,
  });
  const prevByCategory = useMemo(() => {
    const m = new Map<string, number>();
    prevSpendingQ.data?.categories.forEach((c) => m.set(c.category, c.amount));
    return m;
  }, [prevSpendingQ.data]);
  const prevTotal = prevSpendingQ.data?.totalSpending ?? 0;

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

  const handleSetupStart = () => {
    setSetupAccountId(null);
    setAgreeChecked(false);
    setShowSetupSheet(true);
  };

  const handleSetupSave = () => {
    if (setupAccountId === null || !agreeChecked) return;
    setTransferAccount.mutate(setupAccountId, {
      onSuccess: () =>
        agreeCollect.mutate(undefined, {
          onSuccess: () => setShowSetupSheet(false),
        }),
    });
  };

  // 지출/목표 있는 것만, 금액 큰 순. 상위 N개 + 더보기.
  // 편집 중엔 전체 노출(모든 비목에 목표를 설정할 수 있어야 함).
  const TOP_CATEGORY_COUNT = 3;
  const allCategories = goalsQ.data?.categories ?? [];
  const sortedCategories = [...allCategories]
    .filter((c) => c.spent > 0 || c.budget > 0)
    .sort((a, b) => b.spent - a.spent || b.budget - a.budget);
  const visibleCategories = isEditing
    ? allCategories
    : showAllCategories
      ? sortedCategories
      : sortedCategories.slice(0, TOP_CATEGORY_COUNT);
  const hiddenCount = Math.max(0, sortedCategories.length - TOP_CATEGORY_COUNT);
  const categoryTotal = allCategories.reduce((s, c) => s + c.spent, 0);
  // 비중 바·점 색: 상위 3개 블루 농담, 나머지 회색 (무지개 X)
  const BAR_PALETTE = ["#0471E9", "#3D8BEE", "#7DB2F4"];
  const TAIL_GRAY = "#D1D5DB";
  const rankColor = new Map<string, string>();
  sortedCategories.forEach((c, i) => {
    rankColor.set(c.category, BAR_PALETTE[i] ?? TAIL_GRAY);
  });
  const colorFor = (cat: string) => rankColor.get(cat) ?? TAIL_GRAY;
  // 편집 중 설정한 목표 합계 (러닝 탤리)
  const plannedTotal = allCategories.reduce((s, c) => {
    const raw = budgets[c.category]?.trim();
    return s + (raw ? parseAmount(raw) : c.budget);
  }, 0);

  // 권장 예산: 지난달 지출 × 비율로 카테고리 목표를 한 번에 채움
  const applySuggestion = (factor: number) => {
    setBudgets((prev) => {
      const next = { ...prev };
      allCategories.forEach((c) => {
        const p = prevByCategory.get(c.category);
        if (p && p > 0) next[c.category] = String(Math.round(p * factor));
      });
      return next;
    });
  };

  return (
    <>
      <AppHeader variant="sub" title={title} />
      {isLoading ? (
        <div className="mt-6 space-y-6">
          <SkeletonCard lines={2} className="h-24" />
          <SkeletonCard lines={5} className="h-48" />
        </div>
      ) : isError || !goalsQ.data ? (
        <EmptyState title="불러오지 못했어요" className="mt-8" />
      ) : (
        <div className="space-y-8 py-6">
          {/* ── 히어로: 이번 달 지출 총액 ── */}
          <section>
            <p className="text-[13px] text-muted-foreground">{monthLabel} 지출</p>
            <p className="font-numeric mt-1.5 text-[34px] font-bold leading-none tracking-tight text-foreground">
              {formatKRW(spentAmount)}
            </p>
            <p className="mt-2.5 text-[13px] text-muted-foreground">
              예산 {formatKRW(monthlyBudget)}
              {" · "}
              {isOverBudget ? (
                <span className="font-semibold text-[#F04452]">
                  {formatKRW(spentAmount - monthlyBudget)} 초과
                </span>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{usedPct}%</span>{" "}
                  사용
                </>
              )}
            </p>
            {isCurrentMonth && (
              <p className="mt-1 text-[13px]">
                {agreed ? (
                  <>
                    <span className="text-muted-foreground">절약금 </span>
                    <span className="font-numeric font-semibold text-[#0471E9]">
                      {formatKRW(savedAmount)}
                    </span>
                    <span className="text-muted-foreground"> · 월말 CMA 이체</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">남은 예산 </span>
                    <span className="font-numeric font-semibold text-foreground">
                      {formatKRW(remaining)}
                    </span>
                  </>
                )}
              </p>
            )}
            {noAccount && (
              <button
                type="button"
                onClick={() => router.push("/my/savings-transfer")}
                className="mt-3 flex w-full items-center justify-between text-left text-[12px] text-[#B45309]"
              >
                이체 계좌가 설정되지 않았어요
                <ChevronRight className="size-4 shrink-0" />
              </button>
            )}
            {isCurrentMonth && !agreed && (
              <button
                type="button"
                onClick={handleSetupStart}
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl bg-accent px-3.5 py-3 text-left"
              >
                <span className="text-[12px] leading-snug">
                  <span className="font-semibold text-[#0471E9]">절약금 모으기</span>
                  <span className="text-muted-foreground">
                    로 안 쓴 예산을 매달 CMA에 모아보세요
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#0471E9]" />
              </button>
            )}
          </section>

          {/* ── 카테고리 ── */}
          <section>
            <div className="flex items-center justify-between pb-4">
              <p className="text-sm font-semibold text-foreground">카테고리</p>
              {isCurrentMonth &&
                (isEditing ? (
                  <div className="flex items-center gap-3">
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
                      className="text-xs font-semibold text-primary disabled:opacity-50"
                    >
                      {setGoals.isPending ? "저장 중" : "저장"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    목표 설정
                  </button>
                ))}
            </div>

            {/* 지출 구성 비중 — 바 하나에 카테고리별 비율 */}
            {!isEditing && categoryTotal > 0 && (
              <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {sortedCategories
                  .filter((c) => c.spent > 0)
                  .map((c) => (
                    <div
                      key={c.category}
                      style={{
                        width: `${(c.spent / categoryTotal) * 100}%`,
                        backgroundColor: colorFor(c.category),
                      }}
                    />
                  ))}
              </div>
            )}

            {/* 편집: 설정한 목표 합계 + 지난달 지출 참고 */}
            {isEditing && (
              <div className="mb-4 rounded-xl bg-muted/50 px-3.5 py-2.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">설정한 예산 합계</span>
                  <span className="font-numeric font-semibold text-foreground">
                    {formatKRW(plannedTotal)}
                  </span>
                </div>
                {prevTotal > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>지난달 지출</span>
                    <span className="font-numeric">{formatKRW(prevTotal)}</span>
                  </div>
                )}
              </div>
            )}

            {/* 권장 예산 추천 칩 — 지난달 기준으로 목표 일괄 채움 */}
            {isEditing && prevTotal > 0 && (
              <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-0.5">
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  지난달 기준
                </span>
                {[
                  { label: "그대로", factor: 1 },
                  { label: "10% 절약", factor: 0.9 },
                  { label: "20% 절약", factor: 0.8 },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => applySuggestion(s.factor)}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3.5">
              {visibleCategories.map((cat) => (
                <CategoryGoalRow
                  key={cat.category}
                  category={cat.category}
                  budget={cat.budget}
                  spent={cat.spent}
                  total={categoryTotal}
                  color={colorFor(cat.category)}
                  prevSpent={prevByCategory.get(cat.category) ?? 0}
                  isEditing={isEditing}
                  editValue={budgets[cat.category] ?? ""}
                  onEditChange={(raw) =>
                    setBudgets((prev) => ({ ...prev, [cat.category]: raw }))
                  }
                />
              ))}
            </div>

            {!isEditing && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllCategories((v) => !v)}
                className="mt-4 flex w-full items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground"
              >
                {showAllCategories ? "접기" : `더보기 ${hiddenCount}개`}
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    showAllCategories && "rotate-180",
                  )}
                />
              </button>
            )}
          </section>

          {/* ── 카드 추천: 미니멀 진입 줄 ── */}
          <button
            type="button"
            onClick={() => router.push("/recommendations/cards")}
            className="flex w-full items-center gap-3 border-t border-border pt-6 text-left"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent">
              <CreditCard className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                내 소비에 맞는 카드 찾기
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                많이 쓴 곳에서 할인받는 카드를 추천해요
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      )}

      <Sheet open={showSetupSheet} onOpenChange={setShowSetupSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left text-base">절약금 이체 설정</SheetTitle>
          </SheetHeader>
          <p className="mb-4 text-sm text-muted-foreground">
            절약금을 받을 입출금 계좌를 선택해 주세요.
          </p>
          {bankAccountsQ.isLoading ? (
            <SkeletonCard lines={3} />
          ) : (
            <div className="space-y-2.5">
              {(bankAccountsQ.data ?? [])
                .filter(
                  (a) =>
                    a.currency === "KRW" &&
                    a.accountType === "DEMAND" &&
                    !a.isDormant,
                )
                .map((a) => (
                  <button
                    key={a.accountId}
                    type="button"
                    onClick={() => setSetupAccountId(a.accountId)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
                      setupAccountId === a.accountId
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.bankName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.accountName}</p>
                    </div>
                    {setupAccountId === a.accountId && (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setAgreeChecked((v) => !v)}
            className="mt-4 flex w-full items-start gap-2.5 text-left"
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                agreeChecked
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-background",
              )}
            >
              {agreeChecked && <Check className="size-3.5" />}
            </span>
            <span className="text-[13px] leading-snug text-muted-foreground">
              매달 쓰고 남은 예산을 선택한 계좌로 자동 이체하는 절약금 모으기
              서비스 이용에 동의합니다.
            </span>
          </button>
          <Button
            className="mt-5 h-14 w-full text-base font-bold"
            disabled={
              setupAccountId === null ||
              !agreeChecked ||
              setTransferAccount.isPending ||
              agreeCollect.isPending
            }
            onClick={handleSetupSave}
          >
            {setTransferAccount.isPending || agreeCollect.isPending
              ? "처리 중..."
              : "동의하고 시작"}
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CategoryGoalRow({
  category,
  budget,
  spent,
  total,
  color,
  prevSpent,
  isEditing = false,
  editValue = "",
  onEditChange,
}: {
  category: string;
  budget: number;
  spent: number;
  total: number;
  color: string;
  prevSpent?: number;
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (raw: string) => void;
}) {
  const share = total > 0 ? Math.round((spent / total) * 100) : 0;
  const isOver = budget > 0 && spent > budget;
  const dot = (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );

  if (isEditing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-foreground">
          {dot}
          <span className="flex flex-col">
            <span>{category}</span>
            {prevSpent !== undefined && prevSpent > 0 && (
              <span className="text-[11px] font-normal text-muted-foreground">
                지난달 {formatKRW(prevSpent)}
              </span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          목표
          <input
            inputMode="numeric"
            value={editValue}
            onChange={(e) => onEditChange?.(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-24 border-b border-primary bg-transparent text-right text-[12px] font-semibold text-foreground outline-none"
          />
          원
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {dot}
      <span className="flex flex-1 items-center gap-1.5 truncate text-sm text-foreground">
        {category}
        {isOver && (
          <span className="text-[11px] font-medium text-[#F04452]">초과</span>
        )}
      </span>
      <span className="font-numeric text-sm font-semibold text-foreground">
        {formatKRW(spent)}
      </span>
      <span className="font-numeric w-9 shrink-0 text-right text-[11px] text-muted-foreground">
        {share}%
      </span>
    </div>
  );
}
