"use client";

import { useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { RefreshCcw, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { FinanceCalendar } from "@/components/common/FinanceCalendar";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useBudgetGoals,
  useBudgetCalendar,
  useBudgetSavings,
} from "@/hooks/queries/useBudget";
import { useSpendingAnalysis } from "@/hooks/queries/useSpendingAnalysis";
import { useAutoBudgetGoals } from "@/hooks/mutations/useAutoBudgetGoals";
import { useSetManualGoals } from "@/hooks/mutations/useSetManualGoals";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { StockCalendarTab } from "./StockCalendarTab";
import { getCategoryIcon } from "./_utils/categoryIcon";
import type { BudgetGoalCategoryItem, BudgetGoalSummary, CalendarDayItem } from "@/types/domain/budget";

// ── 페이지 진입점 ──────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const goalsQ = useBudgetGoals();

  return (
    <>
      <AppHeader variant="sub" title="가계부" />
      {goalsQ.isLoading ? (
        <div className="space-y-4">
          <SkeletonCard lines={3} className="h-36" />
          <SkeletonCard lines={5} className="h-52" />
        </div>
      ) : goalsQ.isError ? (
        <div className="py-8">
          <EmptyState
            icon={<RefreshCcw className="size-6" />}
            title="불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            action={
              <Button variant="outline" onClick={() => goalsQ.refetch()}>
                다시 시도
              </Button>
            }
          />
        </div>
      ) : !goalsQ.data || goalsQ.data.categories.length === 0 ? (
        <FirstEntry />
      ) : (
        <Dashboard goals={goalsQ.data} />
      )}
    </>
  );
}

// ── 첫 진입 화면 ──────────────────────────────────────────────────────────────

function FirstEntry() {
  const spending = useSpendingAnalysis(3);
  const autoGoals = useAutoBudgetGoals();

  if (spending.isLoading) {
    return (
      <div className="space-y-4 py-5">
        <SkeletonCard lines={3} className="h-36" />
        <SkeletonCard lines={5} className="h-52" />
      </div>
    );
  }

  if (spending.isError) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<RefreshCcw className="size-6" />}
          title="소비 분석을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" onClick={spending.refetch}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  if (spending.data.totalAmount === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="분석할 카드 소비가 없어요"
          description="최근 3개월 카드 소비가 생기면 가계부 목표를 자동으로 제안할 수 있어요."
        />
      </div>
    );
  }

  return (
    <div className="pb-6 pt-5">
      <section className="pb-5">
        <p className="text-xs font-bold tracking-widest text-primary">
          가계부 첫 진입
        </p>
        <h1 className="mt-1 text-[22px] font-bold leading-tight text-foreground">
          3개월 카드 소비를
          <br />
          분석했어요
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이 데이터로 가계부 목표를 자동 설정해요
        </p>
      </section>

      <div className="-mx-5 h-2 bg-muted" />

      <section className="py-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">월 평균 소비</p>
          <p className="font-numeric text-xl font-bold text-foreground">
            {formatKRW(Math.round(spending.data.monthlyAverage))}
          </p>
        </div>
        <div className="mt-5 space-y-4">
          {spending.data.categories.map((cat, i) => (
            <CategoryBar
              key={cat.name}
              name={cat.name}
              percentage={cat.percentage}
              isPrimary={i === 0}
              isOther={cat.isOther}
            />
          ))}
        </div>
      </section>

      <div className="-mx-5 bg-muted pb-4 pt-1">
        <div className="mx-5 rounded-xl bg-accent px-4 py-3">
          <p className="text-sm font-bold text-foreground">
            가계부 목표 자동 설정
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            소비 패턴을 바탕으로 카테고리별 월 목표 금액을 설정했어요. 나중에
            변경할 수 있어요.
          </p>
        </div>
      </div>

      <Button
        className="mt-4 h-14 w-full text-base font-semibold"
        disabled={autoGoals.isPending || autoGoals.isSuccess}
        onClick={() => autoGoals.mutate()}
      >
        {autoGoals.isPending
          ? "설정 중..."
          : autoGoals.isSuccess
            ? "설정 완료!"
            : "가계부 시작하기"}
      </Button>

      {autoGoals.isError && (
        <p className="mt-3 text-center text-xs text-destructive">
          목표 설정에 실패했어요. 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}

// ── 대시보드 ──────────────────────────────────────────────────────────────────

type TabValue = "budget" | "stock";
const TABS: { label: string; value: TabValue }[] = [
  { label: "가계부", value: "budget" },
  { label: "증권 캘린더", value: "stock" },
];

function Dashboard({ goals }: { goals: BudgetGoalSummary }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>("budget");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showGoalSheet, setShowGoalSheet] = useState(false);

  const handleMonthChange = (newMonth: Date) => {
    setCalendarMonth(newMonth);
    const lastDay = new Date(
      newMonth.getFullYear(),
      newMonth.getMonth() + 1,
      0,
    ).getDate();
    setSelectedDate(
      new Date(
        newMonth.getFullYear(),
        newMonth.getMonth(),
        Math.min(selectedDate.getDate(), lastDay),
      ),
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    router.push(
      `/budget/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
    );
  };

  const calendarQ = useBudgetCalendar(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
  );
  const savingsQ = useBudgetSavings();

  const dayMap = new Map<string, CalendarDayItem>();
  calendarQ.data?.days.forEach((d) => dayMap.set(d.date, d));

  const daysInCalendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const today = startOfDay(new Date());
  const now = new Date();
  const isCurrentMonth =
    calendarMonth.getFullYear() === now.getFullYear() &&
    calendarMonth.getMonth() === now.getMonth();

  const calendarDailyBudget = calendarQ.data?.dailyBudget ?? 0;
  const calendarSpent =
    calendarQ.data?.days.reduce((s, d) => s + Number(d.spent), 0) ??
    goals.spentAmount;
  // 현재 월은 goals.monthlyBudget을 직접 사용 (dailyBudget * days 역산 시 나머지 손실)
  const calendarMonthlyBudget = isCurrentMonth
    ? goals.monthlyBudget
    : calendarDailyBudget > 0
      ? calendarDailyBudget * daysInCalendarMonth
      : goals.monthlyBudget;
  const dailyBudget = calendarMonthlyBudget / daysInCalendarMonth;
  const usedPct =
    calendarMonthlyBudget > 0
      ? Math.min(100, Math.round((calendarSpent / calendarMonthlyBudget) * 100))
      : 0;

  return (
    <div className="pb-6">
      {/* 탭 바 */}
      <div className="-mx-5 flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold",
              tab === t.value ? "text-primary" : "text-[#AAAAAA]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "budget" ? (
        <div>
          {/* 파도 캘린더 */}
          <FinanceCalendar
            month={calendarMonth}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            className="pt-4"
            renderDay={(date, isCurrentMonth) => {
              if (!isCurrentMonth) return <span />;
              const key = format(date, "yyyy-MM-dd");
              const info = dayMap.get(key);
              const isFuture = isAfter(startOfDay(date), today);
              const isSelected = isSameDay(date, selectedDate);
              const fillRatio =
                info && dailyBudget > 0
                  ? Math.min(1.2, info.spent / dailyBudget)
                  : 0;
              const isOver = fillRatio > 1;
              const dateColor = isFuture
                ? "#DDDDDD"
                : isOver
                  ? "#FFFFFF"
                  : "#333333";
              const fillPct = Math.min(100, fillRatio * 100);
              const fillColor = `rgba(4,113,233,${isOver ? 0.7 : 0.25})`;
              return (
                <span
                  className={cn(
                    "flex aspect-square w-full flex-col items-center justify-end rounded-lg",
                    isSelected && "ring-2 ring-primary",
                  )}
                  style={
                    info && !isFuture && fillPct > 0
                      ? {
                          background: `linear-gradient(to top, ${fillColor} ${fillPct}%, transparent ${fillPct}%)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="pb-1 text-[11px] leading-none"
                    style={{ color: dateColor }}
                  >
                    {date.getDate()}
                  </span>
                </span>
              );
            }}
            legend={
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-[3px] bg-primary/70" />
                  초과
                </span>
              </div>
            }
          />

          <div className="-mx-5 mt-4 h-2 bg-muted" />

          {/* 지출 요약 카드 + 목표 설정 버튼 */}
          <button
            type="button"
            onClick={() =>
              router.push(
                `/budget/${calendarMonth.getFullYear()}/${calendarMonth.getMonth() + 1}`,
              )
            }
            className="mt-4 w-full rounded-2xl bg-accent px-4 py-[14px] text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#555555]">
                {format(calendarMonth, "M월")} 지출
              </span>
              <div className="flex items-center gap-1">
                {isCurrentMonth && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGoalSheet(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        setShowGoalSheet(true);
                      }
                    }}
                    className="rounded-full border border-primary bg-white px-3 py-1 text-xs font-semibold text-primary"
                  >
                    목표 설정
                  </span>
                )}
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-numeric text-[22px] font-bold text-primary">
                {formatKRW(calendarSpent)}
              </span>
              <span className="font-numeric text-xs text-muted-foreground">
                / {formatKRW(calendarMonthlyBudget)}
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
                남은 예산 {formatKRW(calendarMonthlyBudget - calendarSpent)}
              </span>
            </div>
          </button>

          {/* 이번 달 절약금 */}
          <div className="-mx-5 mt-4 h-2 bg-muted" />
          <div className="flex items-center justify-between pb-3 pt-[14px]">
            <span className="text-sm font-medium text-foreground">
              이번 달 절약금
            </span>
            <span className="text-xs font-medium text-primary">
              월말 CMA 이체 예정
            </span>
          </div>
          {savingsQ.isLoading ? (
            <SkeletonCard lines={2} className="h-20" />
          ) : savingsQ.data ? (
            <div className="rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-[14px]">
              <p className="font-numeric text-[22px] font-bold text-[#22C55E]">
                {formatKRW(savingsQ.data.savedAmount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                목표 예산 대비 절약한 금액 · {format(calendarMonth, "M월")} 말일
                이체 예정
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <StockCalendarTab />
      )}

      {/* 목표 설정 시트 */}
      <GoalEditSheet
        open={showGoalSheet}
        onOpenChange={setShowGoalSheet}
        categories={goals.categories}
      />
    </div>
  );
}

// ── 목표 설정 시트 ────────────────────────────────────────────────────────────

function GoalEditSheet({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetGoalCategoryItem[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-10">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left text-base">목표 설정</SheetTitle>
        </SheetHeader>
        {/* 열릴 때마다 새로 마운트 → 초기값(현재 목표)으로 useState 초기화 (effect 불필요) */}
        {open && (
          <GoalEditForm
            categories={categories}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function GoalEditForm({
  categories,
  onClose,
}: {
  categories: BudgetGoalCategoryItem[];
  onClose: () => void;
}) {
  const setGoals = useSetManualGoals();
  const [budgets, setBudgets] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c.category, String(c.budget)])),
  );

  const handleSave = () => {
    const parsed = categories.map((c) => ({
      category: c.category,
      budget: Number(budgets[c.category]?.replace(/,/g, "") ?? c.budget),
    }));
    setGoals.mutate(parsed, { onSuccess: onClose });
  };

  return (
    <>
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.category} className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
              {(() => {
                const Icon = getCategoryIcon(cat.category);
                return <Icon className="size-[14px] text-primary" />;
              })()}
            </div>
            <span className="w-20 shrink-0 text-sm font-medium text-foreground">
              {cat.category}
            </span>
            <div className="relative flex-1">
              <Input
                inputMode="numeric"
                value={budgets[cat.category] ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setBudgets((prev) => ({ ...prev, [cat.category]: raw }));
                }}
                className="pr-6 text-right font-semibold"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                원
              </span>
            </div>
          </div>
        ))}
      </div>
      <Button
        className="mt-6 h-14 w-full text-base font-semibold"
        disabled={setGoals.isPending}
        onClick={handleSave}
      >
        {setGoals.isPending ? "저장 중..." : "저장하기"}
      </Button>
      {setGoals.isError && (
        <p className="mt-2 text-center text-xs text-destructive">
          저장에 실패했어요. 다시 시도해 주세요.
        </p>
      )}
    </>
  );
}

// ── 첫 진입 카테고리 바 ───────────────────────────────────────────────────────

function CategoryBar({
  name,
  percentage,
  isPrimary,
  isOther,
}: {
  name: string;
  percentage: number;
  isPrimary: boolean;
  isOther: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium",
            isOther ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "font-numeric font-bold",
            isPrimary
              ? "text-primary"
              : isOther
                ? "text-muted-foreground"
                : "text-foreground/60",
          )}
        >
          {percentage}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            isPrimary
              ? "bg-primary"
              : isOther
                ? "bg-muted-foreground/30"
                : "bg-primary/30",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

