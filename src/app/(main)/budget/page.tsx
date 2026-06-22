"use client";

import { useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { RefreshCcw } from "lucide-react";
import { FinanceCalendar } from "@/components/common/FinanceCalendar";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import {
  useBudgetGoals,
  useBudgetCalendar,
  useBudgetTransactions,
} from "@/hooks/queries/useBudget";
import { useSpendingAnalysis } from "@/hooks/queries/useSpendingAnalysis";
import { useAutoBudgetGoals } from "@/hooks/mutations/useAutoBudgetGoals";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { BudgetGoalSummary, CalendarDayItem } from "@/types/domain/budget";

// ── 페이지 진입점: 목표 유무로 화면 분기 ─────────────────────────────────────

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

  const hasGoals = !!goalsQ.data && goalsQ.data.categories.length > 0;

  if (!hasGoals) return <FirstEntry />;
  return <Dashboard goals={goalsQ.data!} />;
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
            소비 패턴을 바탕으로 카테고리별 월 목표 금액을 설정했어요.
            나중에 변경할 수 있어요.
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
  const [tab, setTab] = useState<TabValue>("budget");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleMonthChange = (newMonth: Date) => {
    setCalendarMonth(newMonth);
    const lastDay = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0).getDate();
    const day = Math.min(selectedDate.getDate(), lastDay);
    setSelectedDate(new Date(newMonth.getFullYear(), newMonth.getMonth(), day));
  };

  const calendarQ = useBudgetCalendar(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
  );
  const txQ = useBudgetTransactions({
    type: "DAILY",
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
    day: selectedDate.getDate(),
  });

  const dayMap = new Map<string, CalendarDayItem>();
  calendarQ.data?.days.forEach((d) => dayMap.set(d.date, d));

  // 해당 월 예산 목표 없으면(4·5월 등) 현재 목표 기준으로 daily 계산
  const daysInCalendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarDailyBudget = calendarQ.data?.dailyBudget ?? 0;
  const dailyBudget =
    calendarDailyBudget > 0
      ? calendarDailyBudget
      : goals.monthlyBudget / daysInCalendarMonth;

  // 해당 달 총 지출: calendarQ의 days 합산 (과거 달 포함)
  const calendarSpent = calendarQ.data?.days.reduce(
    (sum, d) => sum + Number(d.spent),
    0,
  ) ?? goals.spentAmount;

  // 예산은 해당 달 목표가 없으면 현재 목표로 fallback
  const calendarMonthlyBudget =
    calendarDailyBudget > 0
      ? calendarDailyBudget * daysInCalendarMonth
      : goals.monthlyBudget;

  const usedPct =
    calendarMonthlyBudget > 0
      ? Math.min(100, Math.round((calendarSpent / calendarMonthlyBudget) * 100))
      : 0;

  const today = startOfDay(new Date());

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
            onSelectDate={setSelectedDate}
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
                : isOver && fillRatio >= 1
                  ? "#FFFFFF"
                  : "#333333";

              const fillPct = Math.min(100, fillRatio * 100);
              const fillColor = `rgba(4,113,233,${isOver ? 0.7 : 0.25})`;

              return (
                <span
                  className={cn(
                    // h-full은 button의 aspect-square 높이를 못 받는 경우가 있어
                    // span 자체에 aspect-square w-full로 크기 보장
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
                  <span className="h-3 w-3 rounded-[3px] bg-primary/25" />
                  절약
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-[3px] bg-primary/70" />
                  초과
                </span>
              </div>
            }
          />

          <div className="-mx-5 mt-4 h-2 bg-muted" />

          {/* 해당 월 지출 카드 */}
          <div className="mt-4 rounded-2xl bg-accent px-4 py-[14px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#555555]">
                {format(calendarMonth, "M월")} 지출
              </span>
              <span className="text-[11px] text-muted-foreground">
                예산 {formatKRW(calendarMonthlyBudget)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-numeric text-[22px] font-bold text-primary">
                {formatKRW(calendarSpent)}
              </span>
              <span className="font-numeric text-xs text-muted-foreground">
                / {formatKRW(calendarMonthlyBudget)}
              </span>
            </div>
            {/* 진행바: 트랙 하늘색, fill 파란색 */}
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
          </div>

          {/* 소비 내역 */}
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
                    <p className="text-[11px] text-[#AAAAAA]">
                      {tx.category} · {formatTime(tx.transactedAt)}
                    </p>
                  </div>
                  <span className="font-numeric text-sm font-bold text-foreground">
                    -{formatKRW(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="pt-4">
          <EmptyState title="증권 캘린더는 준비 중이에요" />
        </div>
      )}
    </div>
  );
}

// ── 공유 컴포넌트 ─────────────────────────────────────────────────────────────

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
        <span className={cn("font-medium", isOther ? "text-muted-foreground" : "text-foreground")}>
          {name}
        </span>
        <span
          className={cn(
            "font-numeric font-bold",
            isPrimary ? "text-primary" : isOther ? "text-muted-foreground" : "text-foreground/60",
          )}
        >
          {percentage}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            isPrimary ? "bg-primary" : isOther ? "bg-muted-foreground/30" : "bg-primary/30",
          )}
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
