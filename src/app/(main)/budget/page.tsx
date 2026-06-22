"use client";

import { useState, useEffect } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import {
  RefreshCcw,
  UtensilsCrossed,
  BookOpen,
  Heart,
  ShoppingBag,
  Car,
  Home,
  Zap,
  Music,
  Receipt,
} from "lucide-react";
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
  useBudgetTransactions,
  useBudgetSavings,
} from "@/hooks/queries/useBudget";
import { useSpendingAnalysis } from "@/hooks/queries/useSpendingAnalysis";
import { useAutoBudgetGoals } from "@/hooks/mutations/useAutoBudgetGoals";
import { useSetManualGoals } from "@/hooks/mutations/useSetManualGoals";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { BudgetGoalCategoryItem, BudgetGoalSummary, CalendarDayItem } from "@/types/domain/budget";

// ── 페이지 진입점 ──────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const goalsQ = useBudgetGoals();

  if (goalsQ.isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <SkeletonCard lines={3} className="h-36" />
        <SkeletonCard lines={5} className="h-52" />
      </div>
    );
  }

  if (goalsQ.isError) {
    return (
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
    );
  }

  if (!goalsQ.data || goalsQ.data.categories.length === 0) return <FirstEntry />;
  return <Dashboard goals={goalsQ.data} />;
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
        <p className="text-xs font-bold tracking-widest text-primary">가계부 첫 진입</p>
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
          <p className="text-sm font-bold text-foreground">가계부 목표 자동 설정</p>
          <p className="mt-1 text-xs text-muted-foreground">
            소비 패턴을 바탕으로 카테고리별 월 목표 금액을 설정했어요. 나중에 변경할 수 있어요.
          </p>
        </div>
      </div>

      <Button
        className="mt-4 h-14 w-full text-base font-semibold"
        disabled={autoGoals.isPending || autoGoals.isSuccess}
        onClick={() => autoGoals.mutate()}
      >
        {autoGoals.isPending ? "설정 중..." : autoGoals.isSuccess ? "설정 완료!" : "가계부 시작하기"}
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
  const [tab, setTab] = useState<TabValue>("budget");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showGoalSheet, setShowGoalSheet] = useState(false);

  const handleMonthChange = (newMonth: Date) => {
    setCalendarMonth(newMonth);
    const lastDay = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0).getDate();
    setSelectedDate(new Date(newMonth.getFullYear(), newMonth.getMonth(), Math.min(selectedDate.getDate(), lastDay)));
  };

  const calendarQ = useBudgetCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1);
  const txQ = useBudgetTransactions({
    type: "DAILY",
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
    day: selectedDate.getDate(),
  });
  const savingsQ = useBudgetSavings();

  const dayMap = new Map<string, CalendarDayItem>();
  calendarQ.data?.days.forEach((d) => dayMap.set(d.date, d));

  const daysInCalendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const today = startOfDay(new Date());
  const now = new Date();
  const isCurrentMonth = calendarMonth.getFullYear() === now.getFullYear() && calendarMonth.getMonth() === now.getMonth();

  const calendarDailyBudget = calendarQ.data?.dailyBudget ?? 0;
  const calendarSpent = calendarQ.data?.days.reduce((s, d) => s + Number(d.spent), 0) ?? goals.spentAmount;
  // 현재 월은 goals.monthlyBudget을 직접 사용 (dailyBudget * days 역산 시 나머지 손실)
  const calendarMonthlyBudget = isCurrentMonth
    ? goals.monthlyBudget
    : calendarDailyBudget > 0
      ? calendarDailyBudget * daysInCalendarMonth
      : goals.monthlyBudget;
  const dailyBudget = calendarMonthlyBudget / daysInCalendarMonth;
  const usedPct = calendarMonthlyBudget > 0 ? Math.min(100, Math.round((calendarSpent / calendarMonthlyBudget) * 100)) : 0;

  return (
    <div className="pb-6">
      {/* 탭 바 */}
      <div className="-mx-5 flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn("flex-1 py-3 text-sm font-semibold", tab === t.value ? "text-primary" : "text-[#AAAAAA]")}
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
            onSelectDate={setSelectedDate}
            className="pt-4"
            renderDay={(date, isCurrentMonth) => {
              if (!isCurrentMonth) return <span />;
              const key = format(date, "yyyy-MM-dd");
              const info = dayMap.get(key);
              const isFuture = isAfter(startOfDay(date), today);
              const isSelected = isSameDay(date, selectedDate);
              const fillRatio = info && dailyBudget > 0 ? Math.min(1.2, info.spent / dailyBudget) : 0;
              const isOver = fillRatio > 1;
              const dateColor = isFuture ? "#DDDDDD" : isOver ? "#FFFFFF" : "#333333";
              const fillPct = Math.min(100, fillRatio * 100);
              const fillColor = `rgba(4,113,233,${isOver ? 0.7 : 0.25})`;
              return (
                <span
                  className={cn("flex aspect-square w-full flex-col items-center justify-end rounded-lg", isSelected && "ring-2 ring-primary")}
                  style={info && !isFuture && fillPct > 0 ? { background: `linear-gradient(to top, ${fillColor} ${fillPct}%, transparent ${fillPct}%)` } : undefined}
                >
                  <span className="pb-1 text-[11px] leading-none" style={{ color: dateColor }}>
                    {date.getDate()}
                  </span>
                </span>
              );
            }}
            legend={
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] bg-primary/25" />절약</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] bg-primary/70" />초과</span>
              </div>
            }
          />

          <div className="-mx-5 mt-4 h-2 bg-muted" />

          {/* 지출 요약 카드 + 목표 설정 버튼 */}
          <div className="mt-4 rounded-2xl bg-accent px-4 py-[14px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#555555]">{format(calendarMonth, "M월")} 지출</span>
              {isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => setShowGoalSheet(true)}
                  className="rounded-full border border-primary bg-white px-3 py-1 text-xs font-semibold text-primary"
                >
                  목표 설정
                </button>
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-numeric text-[22px] font-bold text-primary">{formatKRW(calendarSpent)}</span>
              <span className="font-numeric text-xs text-muted-foreground">/ {formatKRW(calendarMonthlyBudget)}</span>
            </div>
            <div className="mt-3 h-[7px] w-full overflow-hidden rounded-full bg-[#C8DFF8]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px]">
              <span className="text-muted-foreground">{usedPct}% 사용</span>
              <span className="text-primary">남은 예산 {formatKRW(calendarMonthlyBudget - calendarSpent)}</span>
            </div>
          </div>

          {/* 날짜별 소비 내역 */}
          <div className="-mx-5 mt-4 h-2 bg-muted" />
          <p className="pb-2 pt-[15px] text-xs font-medium text-muted-foreground">
            {format(selectedDate, "M월 d일 소비 내역", { locale: ko })}
          </p>
          {txQ.isLoading ? (
            <SkeletonCard lines={3} />
          ) : txQ.isError ? (
            <EmptyState title="내역을 불러오지 못했어요" />
          ) : !txQ.data?.transactions.length ? (
            <EmptyState title="이 날 소비 내역이 없어요" />
          ) : (
            <div className="divide-y divide-border">
              {txQ.data.transactions.map((tx) => (
                <div key={tx.transactionId} className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">{tx.description}</p>
                    <p className="text-[11px] text-[#AAAAAA]">{tx.category} · {formatTime(tx.transactedAt)}</p>
                  </div>
                  <span className="font-numeric text-sm font-bold text-foreground">-{formatKRW(tx.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* 카테고리별 지출 */}
          <div className="-mx-5 mt-4 h-2 bg-muted" />
          <p className="pb-3 pt-[15px] text-xs font-medium text-muted-foreground">카테고리별 지출</p>
          <div className="space-y-[10px]">
            {goals.categories.map((cat) => (
              <CategoryGoalRow key={cat.category} {...cat} />
            ))}
          </div>

          {/* 이번 달 절약금 */}
          <div className="-mx-5 mt-4 h-2 bg-muted" />
          <div className="flex items-center justify-between pb-3 pt-[14px]">
            <span className="text-sm font-medium text-foreground">이번 달 절약금</span>
            <span className="text-xs font-medium text-primary">월말 CMA 이체 예정</span>
          </div>
          {savingsQ.isLoading ? (
            <SkeletonCard lines={2} className="h-20" />
          ) : savingsQ.data ? (
            <div className="rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-[14px]">
              <p className="font-numeric text-[22px] font-bold text-[#22C55E]">
                {formatKRW(savingsQ.data.savedAmount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                목표 예산 대비 절약한 금액 · {format(calendarMonth, "M월")} 말일 이체 예정
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="pt-4">
          <EmptyState title="증권 캘린더는 준비 중이에요" />
        </div>
      )}

      {/* 목표 설정 시트 */}
      <GoalEditSheet open={showGoalSheet} onOpenChange={setShowGoalSheet} categories={goals.categories} />
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
  const setGoals = useSetManualGoals();
  const [budgets, setBudgets] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c.category, String(c.budget)])),
  );

  useEffect(() => {
    if (open) {
      setBudgets(Object.fromEntries(categories.map((c) => [c.category, String(c.budget)])));
    }
  }, [open, categories]);

  const handleSave = () => {
    const parsed = categories.map((c) => ({
      category: c.category,
      budget: Number(budgets[c.category]?.replace(/,/g, "") ?? c.budget),
    }));
    setGoals.mutate(parsed, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-10">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left text-base">목표 설정</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                <CategoryIcon name={cat.category} className="size-[14px] text-primary" />
              </div>
              <span className="w-20 shrink-0 text-sm font-medium text-foreground">{cat.category}</span>
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
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-6 h-14 w-full text-base font-semibold" disabled={setGoals.isPending} onClick={handleSave}>
          {setGoals.isPending ? "저장 중..." : "저장하기"}
        </Button>
        {setGoals.isError && (
          <p className="mt-2 text-center text-xs text-destructive">저장에 실패했어요. 다시 시도해 주세요.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── 카테고리별 지출 행 ────────────────────────────────────────────────────────

function CategoryGoalRow({ category, budget, spent }: BudgetGoalCategoryItem) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const hasSpending = spent > 0;

  return (
    <div className="space-y-[5px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", hasSpending ? "bg-accent" : "bg-muted")}>
            <CategoryIcon name={category} className={cn("size-[14px]", hasSpending ? "text-primary" : "text-[#AAAAAA]")} />
          </div>
          <span className={cn("text-xs font-medium", hasSpending ? "text-foreground" : "text-[#AAAAAA]")}>
            {category}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("text-xs font-medium", hasSpending ? "text-foreground" : "text-[#AAAAAA]")}>
            {formatKRW(spent)}
          </span>
          <span className={cn("text-[11px]", hasSpending ? "text-[#888888]" : "text-[#AAAAAA]")}>
            / {formatKRW(budget)}
          </span>
        </div>
      </div>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", hasSpending ? "bg-primary" : "bg-[#E8E8E8]")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── 카테고리 아이콘 ───────────────────────────────────────────────────────────

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = getCategoryIcon(name);
  return <Icon className={className} />;
}

function getCategoryIcon(name: string) {
  if (name.includes("식") || name.includes("카페") || name.includes("음식")) return UtensilsCrossed;
  if (name.includes("교육") || name.includes("학원") || name.includes("도서")) return BookOpen;
  if (name.includes("의료") || name.includes("병원") || name.includes("미용")) return Heart;
  if (name.includes("쇼핑")) return ShoppingBag;
  if (name.includes("교통") || name.includes("주유")) return Car;
  if (name.includes("주거") || name.includes("관리비")) return Home;
  if (name.includes("공과금") || name.includes("통신")) return Zap;
  if (name.includes("문화") || name.includes("여가") || name.includes("구독")) return Music;
  return Receipt;
}

// ── 첫 진입 카테고리 바 ───────────────────────────────────────────────────────

function CategoryBar({ name, percentage, isPrimary, isOther }: { name: string; percentage: number; isPrimary: boolean; isOther: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", isOther ? "text-muted-foreground" : "text-foreground")}>{name}</span>
        <span className={cn("font-numeric font-bold", isPrimary ? "text-primary" : isOther ? "text-muted-foreground" : "text-foreground/60")}>
          {percentage}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", isPrimary ? "bg-primary" : isOther ? "bg-muted-foreground/30" : "bg-primary/30")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatTime(isoStr: string) {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
